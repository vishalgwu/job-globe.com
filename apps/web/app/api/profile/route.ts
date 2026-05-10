/**
 * /api/profile
 *
 * GET  — return the authenticated user's profile, or demo stub if unauthenticated.
 * POST — upsert profile from onboarding answers. Authenticated users write to
 *        the profiles table; unauthenticated users get the same validation +
 *        a demo-mode response (backwards-compatible with the onboarding flow
 *        being accessible without a login wall).
 */

import { type NextRequest, NextResponse } from "next/server";

import type {
  CompanySizePreference,
  OnboardingAnswers,
  ProfileSaveResponse,
  ProfileSummary,
  ProfileValidationError,
  SalarySensitivity,
  TimeToStart,
} from "@job-globe/shared-types";

import { resolveRequestUser } from "../../../lib/supabase/auth";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

// ── Allowed enum values (mirrors shared-types) ─────────────────────────────

const remotePreferences: OnboardingAnswers["remotePreference"][] = [
  "remote",
  "hybrid",
  "on-site",
  "flexible",
];
const salarySensitivities: SalarySensitivity[] = ["low", "medium", "high"];
const companySizePreferences: CompanySizePreference[] = [
  "startup",
  "mid-market",
  "enterprise",
  "no-preference",
];
const timeToStartOptions: TimeToStart[] = [
  "now",
  "one-to-three-months",
  "three-plus-months",
  "exploring",
];
const jobTypes: OnboardingAnswers["jobTypes"][number][] = [
  "internship",
  "new-grad",
  "full-time",
  "contract",
];

// ── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);

  if (!user) {
    return NextResponse.json({
      mode: "demo",
      profile: null,
      source: "unauthenticated",
      message: "Sign in to save and retrieve your profile.",
    });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: row } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({
        mode: "authenticated",
        profile: null,
        source: "supabase",
        message: "No profile found. Complete onboarding to create one.",
      });
    }

    const profile: ProfileSummary = {
      id: row.id,
      userId: user.id,
      mode: "authenticated",
      answers: dbRowToAnswers(row),
      savedAt: row.updated_at,
    };

    return NextResponse.json({ mode: "authenticated", profile, source: "supabase" });
  } catch (err) {
    console.error("profile GET error", err);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const response: ProfileSaveResponse = {
      ok: false,
      mode: "demo",
      errors: [{ field: "payload", message: "Request body must be valid JSON." }],
    };
    return NextResponse.json(response, { status: 400 });
  }

  const answersPayload = isRecord(payload) ? payload.answers : null;
  const errors = validateAnswers(answersPayload);

  if (errors.length > 0) {
    const response: ProfileSaveResponse = { ok: false, mode: "demo", errors };
    return NextResponse.json(response, { status: 400 });
  }

  const answers = normalizeAnswers(answersPayload as Record<string, unknown>);
  const user = await resolveRequestUser(request);

  // ── Demo mode (unauthenticated) ──────────────────────────────────────────
  if (!user) {
    const profile: ProfileSummary = {
      id: "demo-profile-local",
      userId: null,
      mode: "demo",
      answers,
      savedAt: new Date().toISOString(),
    };
    const response: ProfileSaveResponse = { ok: true, mode: "demo", profile };
    return NextResponse.json(response, { status: 202 });
  }

  // ── Authenticated mode ───────────────────────────────────────────────────
  try {
    const supabase = createServerSupabaseClient();

    const preferences = {
      desiredRoleFamily: answers.desiredRoleFamily,
      jobTypes: answers.jobTypes,
      companySizePreference: answers.companySizePreference,
      timeToStart: answers.timeToStart,
    };

    const { data: row, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          headline: answers.desiredRoleFamily,
          preferred_locations: answers.targetLocations,
          preferred_remote_type: answers.remotePreference,
          work_authorization: answers.workAuthorization,
          salary_expectation: answers.salarySensitivity
            ? { sensitivity: answers.salarySensitivity }
            : null,
          preferences,
          resume_consent_accepted: answers.resumeConsentAccepted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id, updated_at")
      .single();

    if (error || !row) {
      console.error("profile upsert error", error);
      return NextResponse.json(
        {
          ok: false,
          mode: "authenticated",
          errors: [{ field: "payload", message: "Failed to save profile." }],
        },
        { status: 500 },
      );
    }

    const profile: ProfileSummary = {
      id: row.id,
      userId: user.id,
      mode: "authenticated",
      answers,
      savedAt: row.updated_at,
    };

    const response: ProfileSaveResponse = { ok: true, mode: "authenticated", profile };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("profile POST error", err);
    return NextResponse.json({ ok: false, mode: "authenticated", errors: [] }, { status: 500 });
  }
}

// ── DB row -> OnboardingAnswers ─────────────────────────────────────────────

function dbRowToAnswers(row: Record<string, unknown>): OnboardingAnswers {
  const prefs = isRecord(row.preferences) ? row.preferences : {};
  const salaryExp = isRecord(row.salary_expectation) ? row.salary_expectation : {};
  return {
    desiredRoleFamily: readString(prefs.desiredRoleFamily ?? row.headline) ?? "",
    targetLocations: Array.isArray(row.preferred_locations)
      ? (row.preferred_locations as string[])
      : [],
    remotePreference: remotePreferences.includes(
      row.preferred_remote_type as OnboardingAnswers["remotePreference"],
    )
      ? (row.preferred_remote_type as OnboardingAnswers["remotePreference"])
      : "flexible",
    jobTypes: Array.isArray(prefs.jobTypes)
      ? (prefs.jobTypes as OnboardingAnswers["jobTypes"])
      : [],
    salarySensitivity: salarySensitivities.includes(
      salaryExp.sensitivity as SalarySensitivity,
    )
      ? (salaryExp.sensitivity as SalarySensitivity)
      : null,
    companySizePreference: companySizePreferences.includes(
      prefs.companySizePreference as CompanySizePreference,
    )
      ? (prefs.companySizePreference as CompanySizePreference)
      : "no-preference",
    timeToStart: timeToStartOptions.includes(prefs.timeToStart as TimeToStart)
      ? (prefs.timeToStart as TimeToStart)
      : "exploring",
    workAuthorization: readString(row.work_authorization),
    resumeConsentAccepted: row.resume_consent_accepted === true,
    resumeFileName: null,
  };
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateAnswers(value: unknown): ProfileValidationError[] {
  if (!isRecord(value)) {
    return [{ field: "payload", message: "Request body must include an answers object." }];
  }

  const errors: ProfileValidationError[] = [];

  if (!readString(value.desiredRoleFamily)) {
    errors.push({ field: "desiredRoleFamily", message: "Choose a desired role family." });
  }

  if (readStringArray(value.targetLocations).length === 0) {
    errors.push({ field: "targetLocations", message: "Add at least one target location." });
  }

  if (
    !remotePreferences.includes(value.remotePreference as OnboardingAnswers["remotePreference"])
  ) {
    errors.push({
      field: "remotePreference",
      message: "Choose remote, hybrid, on-site, or flexible.",
    });
  }

  const selectedJobTypes = readStringArray(value.jobTypes);
  if (
    selectedJobTypes.length === 0 ||
    selectedJobTypes.some((jobType) => !jobTypes.includes(jobType as never))
  ) {
    errors.push({ field: "jobTypes", message: "Choose at least one supported job type." });
  }

  return errors;
}

function normalizeAnswers(value: Record<string, unknown>): OnboardingAnswers {
  const salarySensitivity = readString(value.salarySensitivity);
  const companySizePreference = readString(value.companySizePreference);
  const timeToStart = readString(value.timeToStart);

  return {
    desiredRoleFamily: readString(value.desiredRoleFamily) ?? "",
    targetLocations: readStringArray(value.targetLocations),
    remotePreference: remotePreferences.includes(
      value.remotePreference as OnboardingAnswers["remotePreference"],
    )
      ? (value.remotePreference as OnboardingAnswers["remotePreference"])
      : "flexible",
    jobTypes: readStringArray(value.jobTypes).filter((jobType) =>
      jobTypes.includes(jobType as OnboardingAnswers["jobTypes"][number]),
    ) as OnboardingAnswers["jobTypes"],
    salarySensitivity:
      salarySensitivity && salarySensitivities.includes(salarySensitivity as SalarySensitivity)
        ? (salarySensitivity as SalarySensitivity)
        : null,
    companySizePreference:
      companySizePreference &&
      companySizePreferences.includes(companySizePreference as CompanySizePreference)
        ? (companySizePreference as CompanySizePreference)
        : "no-preference",
    timeToStart:
      timeToStart && timeToStartOptions.includes(timeToStart as TimeToStart)
        ? (timeToStart as TimeToStart)
        : "exploring",
    workAuthorization: readString(value.workAuthorization),
    resumeConsentAccepted:
      typeof value.resumeConsentAccepted === "boolean" ? value.resumeConsentAccepted : false,
    resumeFileName: readString(value.resumeFileName),
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}
