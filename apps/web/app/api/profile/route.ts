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

export async function GET() {
  return NextResponse.json({
    mode: "demo",
    profile: null,
    source: "step-2-foundation",
    message:
      "Profile persistence is a safe demo stub until authenticated Supabase writes are wired.",
  });
}

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

  const profile: ProfileSummary = {
    id: "demo-profile-local",
    userId: null,
    mode: "demo",
    answers: normalizeAnswers(answersPayload as Record<string, unknown>),
    savedAt: new Date().toISOString(),
  };

  const response: ProfileSaveResponse = {
    ok: true,
    mode: "demo",
    profile,
  };

  return NextResponse.json(response, { status: 202 });
}

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
