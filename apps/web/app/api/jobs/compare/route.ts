/**
 * GET /api/jobs/compare?ids=<uuid>,<uuid>[,<uuid>]
 *
 * Fetch 2–4 canonical jobs by ID for side-by-side comparison.
 * Returns them in the same JobDetail shape used by the job panel,
 * with optional preference-aware match scoring if the user is signed in.
 *
 * Query params:
 *   ids  — comma-separated list of job UUIDs (2–4 required)
 */

import { type NextRequest, NextResponse } from "next/server";

import type { OnboardingAnswers } from "@job-globe/shared-types";
import { getJobDetailWithProfile } from "@/lib/jobs/supabaseJobs";
import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIN_COMPARE = 2;
const MAX_COMPARE = 4;

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json(
      { error: "ids query parameter is required (comma-separated job UUIDs)." },
      { status: 400 },
    );
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length < MIN_COMPARE || ids.length > MAX_COMPARE) {
    return NextResponse.json(
      { error: `Provide between ${MIN_COMPARE} and ${MAX_COMPARE} job IDs to compare.` },
      { status: 400 },
    );
  }

  // Basic UUID format validation — prevent injection via the query string.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalidId = ids.find((id) => !UUID_RE.test(id));
  if (invalidId) {
    return NextResponse.json(
      { error: `Invalid job ID format: ${invalidId}` },
      { status: 400 },
    );
  }

  // Resolve optional user profile for personalised match scoring.
  let profileAnswers: OnboardingAnswers | null = null;
  let profileId: string | null = null;
  try {
    const user = await resolveRequestUser(request);
    if (user) {
      const supabase = createServerSupabaseClient();
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileRow) {
        profileAnswers = rowToAnswers(profileRow);
        profileId = profileRow.id as string;
      }
    }
  } catch {
    // Non-fatal — continue without personalisation
  }

  // Fetch all jobs in parallel.
  const results = await Promise.allSettled(
    ids.map((id) => getJobDetailWithProfile(id, profileAnswers, profileId)),
  );

  const jobs = results.map((result, i) => {
    if (result.status === "fulfilled") {
      return { id: ids[i], job: result.value };
    }
    return { id: ids[i], job: null, error: "Failed to load job." };
  });

  // Surface a 404 only if ALL jobs are missing.
  const found = jobs.filter((j) => j.job !== null);
  if (found.length === 0) {
    return NextResponse.json({ error: "None of the requested jobs were found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    jobs,
    // Comparison metadata: highest-scoring job (if match scores are present)
    topMatch: (() => {
      const scored = found
        .map((j) => ({
          id: j.id,
          score: j.job?.matchBreakdown?.score ?? null,
        }))
        .filter((j): j is { id: string; score: number } => j.score !== null);
      if (scored.length === 0) return null;
      return scored.reduce((best, curr) => (curr.score > best.score ? curr : best));
    })(),
  });
}

// ── DB row → OnboardingAnswers (mirrors /api/jobs logic) ──────────────────
// Duplicated here to keep the route self-contained without a circular import.

function rowToAnswers(row: Record<string, unknown>): OnboardingAnswers {
  const prefs = isRecord(row.preferences) ? row.preferences : {};
  const salaryExp = isRecord(row.salary_expectation) ? row.salary_expectation : {};

  const remotePref = row.preferred_remote_type as string;
  const remotePreference = (["remote", "hybrid", "on-site", "flexible"] as const).includes(
    remotePref as never,
  )
    ? (remotePref as OnboardingAnswers["remotePreference"])
    : "flexible";

  return {
    desiredRoleFamily: readString(prefs.desiredRoleFamily ?? row.headline) ?? "",
    targetLocations: Array.isArray(row.preferred_locations)
      ? (row.preferred_locations as string[])
      : [],
    remotePreference,
    jobTypes: Array.isArray(prefs.jobTypes)
      ? (prefs.jobTypes as OnboardingAnswers["jobTypes"])
      : [],
    salarySensitivity: readString(salaryExp.sensitivity) as OnboardingAnswers["salarySensitivity"],
    companySizePreference:
      (prefs.companySizePreference as OnboardingAnswers["companySizePreference"]) ??
      "no-preference",
    timeToStart:
      (prefs.timeToStart as OnboardingAnswers["timeToStart"]) ?? "exploring",
    workAuthorization: readString(row.work_authorization),
    resumeConsentAccepted: row.resume_consent_accepted === true,
    resumeFileName: null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
