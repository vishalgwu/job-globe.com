/**
 * Tests for profile validation and normalisation logic.
 *
 * We extract the pure validation helpers from the route handler and test
 * them in isolation — no Next.js runtime needed.
 */

import { describe, expect, it } from "vitest";

// ── Inline the pure helpers (mirrors /api/profile/route.ts logic) ──────────
// This keeps tests decoupled from Next.js server-only imports.

type RemotePreference = "remote" | "hybrid" | "on-site" | "flexible";
const remotePreferences: RemotePreference[] = ["remote", "hybrid", "on-site", "flexible"];
const jobTypes = ["internship", "new-grad", "full-time", "contract"];

interface ValidationError {
  field: string;
  message: string;
}

function validateAnswers(value: unknown): ValidationError[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [{ field: "payload", message: "Request body must include an answers object." }];
  }

  const v = value as Record<string, unknown>;
  const errors: ValidationError[] = [];

  const roleFamily = typeof v.desiredRoleFamily === "string" ? v.desiredRoleFamily.trim() : "";
  if (!roleFamily) {
    errors.push({ field: "desiredRoleFamily", message: "Choose a desired role family." });
  }

  const locations = Array.isArray(v.targetLocations) ? v.targetLocations : [];
  if (locations.length === 0) {
    errors.push({ field: "targetLocations", message: "Add at least one target location." });
  }

  if (!remotePreferences.includes(v.remotePreference as RemotePreference)) {
    errors.push({
      field: "remotePreference",
      message: "Choose remote, hybrid, on-site, or flexible.",
    });
  }

  const selectedJobTypes = Array.isArray(v.jobTypes) ? v.jobTypes : [];
  if (
    selectedJobTypes.length === 0 ||
    selectedJobTypes.some((jt) => !jobTypes.includes(jt as string))
  ) {
    errors.push({ field: "jobTypes", message: "Choose at least one supported job type." });
  }

  return errors;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("validateAnswers", () => {
  const validAnswers = {
    desiredRoleFamily: "software-engineering",
    targetLocations: ["London"],
    remotePreference: "hybrid",
    jobTypes: ["full-time"],
  };

  it("returns no errors for a valid answers object", () => {
    expect(validateAnswers(validAnswers)).toHaveLength(0);
  });

  it("requires desiredRoleFamily", () => {
    const errors = validateAnswers({ ...validAnswers, desiredRoleFamily: "" });
    expect(errors.some((e) => e.field === "desiredRoleFamily")).toBe(true);
  });

  it("requires at least one target location", () => {
    const errors = validateAnswers({ ...validAnswers, targetLocations: [] });
    expect(errors.some((e) => e.field === "targetLocations")).toBe(true);
  });

  it("rejects an invalid remotePreference", () => {
    const errors = validateAnswers({ ...validAnswers, remotePreference: "office-only" });
    expect(errors.some((e) => e.field === "remotePreference")).toBe(true);
  });

  it("requires at least one valid job type", () => {
    const errors = validateAnswers({ ...validAnswers, jobTypes: [] });
    expect(errors.some((e) => e.field === "jobTypes")).toBe(true);
  });

  it("rejects unknown job types", () => {
    const errors = validateAnswers({ ...validAnswers, jobTypes: ["gig-work"] });
    expect(errors.some((e) => e.field === "jobTypes")).toBe(true);
  });

  it("returns an error for a non-object payload", () => {
    expect(validateAnswers(null)).toHaveLength(1);
    expect(validateAnswers("string")).toHaveLength(1);
    expect(validateAnswers(42)).toHaveLength(1);
  });

  it("accepts all four valid remote preferences", () => {
    for (const pref of remotePreferences) {
      const errors = validateAnswers({ ...validAnswers, remotePreference: pref });
      expect(errors.some((e) => e.field === "remotePreference")).toBe(false);
    }
  });

  it("accepts all four valid job types individually", () => {
    for (const jobType of jobTypes) {
      const errors = validateAnswers({ ...validAnswers, jobTypes: [jobType] });
      expect(errors.some((e) => e.field === "jobTypes")).toBe(false);
    }
  });
});

// ── Resume consent enforcement ─────────────────────────────────────────────

describe("resume consent", () => {
  it("resumeConsentAccepted must be explicitly true", () => {
    // The upload route rejects if user is unauthenticated (401).
    // Here we confirm the boolean normalisation rule used in the profile route.
    function normaliseConsent(value: unknown): boolean {
      return typeof value === "boolean" ? value : false;
    }

    expect(normaliseConsent(true)).toBe(true);
    expect(normaliseConsent(false)).toBe(false);
    expect(normaliseConsent("true")).toBe(false);   // string is rejected
    expect(normaliseConsent(1)).toBe(false);          // number is rejected
    expect(normaliseConsent(undefined)).toBe(false);
  });
});
