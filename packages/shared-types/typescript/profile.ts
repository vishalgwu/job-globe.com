import type { JobType, RemoteMode } from "./job";

export type SalarySensitivity = "low" | "medium" | "high";

export type CompanySizePreference = "startup" | "mid-market" | "enterprise" | "no-preference";

export type TimeToStart = "now" | "one-to-three-months" | "three-plus-months" | "exploring";

export interface OnboardingAnswers {
  desiredRoleFamily: string;
  targetLocations: string[];
  remotePreference: RemoteMode | "flexible";
  jobTypes: JobType[];
  salarySensitivity: SalarySensitivity | null;
  companySizePreference: CompanySizePreference;
  timeToStart: TimeToStart;
  workAuthorization: string | null;
  resumeConsentAccepted: boolean;
  resumeFileName: string | null;
}

export interface ProfileSummary {
  id: string;
  userId: string | null;
  mode: "demo" | "authenticated";
  answers: OnboardingAnswers;
  savedAt: string;
}

export interface ProfileValidationError {
  field: keyof OnboardingAnswers | "payload";
  message: string;
}

export interface ProfileSaveRequest {
  answers: OnboardingAnswers;
}

export type ProfileSaveResponse =
  | {
      ok: true;
      mode: "demo" | "authenticated";
      profile: ProfileSummary;
    }
  | {
      ok: false;
      mode: "demo" | "authenticated";
      errors: ProfileValidationError[];
    };
