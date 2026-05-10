import { type NextRequest, NextResponse } from "next/server";

import type { JobsApiResponse } from "@job-globe/shared-types";
import { parseJobsApiMode, parseSearchFilters } from "@/lib/jobs/filters";
import {
  getCityData,
  getCompanyBubbles,
  getCountryData,
  getGlobeMarkers,
  getJobDetailWithProfile,
  getJobList,
  getSupabaseJobs,
} from "@/lib/jobs/supabaseJobs";
import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = parseJobsApiMode(request.nextUrl.searchParams);
  const filters = parseSearchFilters(request.nextUrl.searchParams);

  try {
    if (mode === "detail") {
      const jobId = request.nextUrl.searchParams.get("id");

      // Resolve the user's profile for personalised match scoring.
      // Falls back to placeholder data for unauthenticated requests.
      let profileAnswers: import("@job-globe/shared-types").OnboardingAnswers | null = null;
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
          }
        }
      } catch {
        // Non-fatal — continue without profile
      }

      const job = jobId ? await getJobDetailWithProfile(jobId, profileAnswers) : null;

      if (!job) {
        return NextResponse.json(
          { error: { code: "job_not_found", message: "Supabase job not found." }, source: "supabase" },
          { status: 404 },
        );
      }

      const response: JobsApiResponse = { mode, source: "supabase", job };
      return NextResponse.json(response);
    }

    const jobs = await getSupabaseJobs(filters);

    if (mode === "jobs") {
      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        jobs: getJobList(jobs),
      };

      return NextResponse.json(response);
    }

    if (mode === "city") {
      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        bubbles: getCompanyBubbles(jobs),
        markers: getGlobeMarkers(jobs),
      };

      return NextResponse.json(response);
    }

    if (mode === "country") {
      const cities = getCityData(jobs);
      const countries = getCountryData(jobs);

      const countryCode = filters.countryCode;
      const country = countryCode
        ? (countries.find((c) => c.countryCode === countryCode) ?? null)
        : null;

      const response: JobsApiResponse = {
        mode,
        source: "supabase",
        filters,
        country,
        cities,
      };

      return NextResponse.json(response);
    }

    // mode === "global"
    const response: JobsApiResponse = {
      mode: "global",
      source: "supabase",
      filters,
      countries: getCountryData(jobs),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("jobs API error", err);
    return NextResponse.json(
      { error: { code: "internal_error", message: "Failed to fetch jobs." }, source: "supabase" },
      { status: 500 },
    );
  }
}

// ── DB row → OnboardingAnswers (mirrors /api/profile route logic) ──────────

import type { OnboardingAnswers } from "@job-globe/shared-types";

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
    companySizePreference: (prefs.companySizePreference as OnboardingAnswers["companySizePreference"]) ?? "no-preference",
    timeToStart: (prefs.timeToStart as OnboardingAnswers["timeToStart"]) ?? "exploring",
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
