/**
 * Tests for the profile-to-job match scorer.
 *
 * These are pure-function tests — no Supabase, no HTTP, no DOM.
 */

import { describe, expect, it } from "vitest";

import {
  buildMatchBreakdown,
  buildSummary,
  cosineSimilarity,
  ruleBasedScore,
  type JobSnapshot,
  type ProfileSnapshot,
} from "../lib/match/scorer";

// ── Fixtures ────────────────────────────────────────────────────────────────

const swEngineerProfile: ProfileSnapshot = {
  desiredRoleFamily: "software-engineering",
  targetLocations: ["London", "Remote"],
  remotePreference: "hybrid",
  jobTypes: ["full-time", "contract"],
};

const remoteSwJob: JobSnapshot = {
  title: "Senior Software Engineer",
  remote_type: "remote",
  employment_type: "full-time",
  location_city: "London",
  location_country: "United Kingdom",
  taxonomy_functions: ["software-engineering"],
};

const onsiteDesignJob: JobSnapshot = {
  title: "Product Designer",
  remote_type: "on-site",
  employment_type: "full-time",
  location_city: "Berlin",
  location_country: "Germany",
  taxonomy_functions: ["design"],
};

// ── cosineSimilarity ────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 1], [1, 0, 1])).toBeCloseTo(1.0);
  });

  it("returns 0.0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });
});

// ── ruleBasedScore ──────────────────────────────────────────────────────────

describe("ruleBasedScore", () => {
  it("gives a high score for a well-matching remote SW job", () => {
    const { score } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it("gives a lower score for a mismatched on-site design job", () => {
    const { score: highScore } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    const { score: lowScore } = ruleBasedScore(swEngineerProfile, onsiteDesignJob);
    expect(lowScore).toBeLessThan(highScore);
  });

  it("score is between 0 and 1 inclusive", () => {
    const { score } = ruleBasedScore(swEngineerProfile, onsiteDesignJob);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("remote job adds Location as a strength", () => {
    const { strengths } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    const locSignal = strengths.find((s) => s.label === "Location");
    expect(locSignal).toBeDefined();
    expect(locSignal?.status).toBe("strong");
  });

  it("role-family match appears as a strength", () => {
    const { strengths } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    const roleSignal = strengths.find((s) => s.label === "Role family");
    expect(roleSignal).toBeDefined();
  });

  it("missing must-have skill caps score correctly", () => {
    // Profile wants contract work only — job is full-time  should be partial/gap
    const contractOnlyProfile: ProfileSnapshot = {
      ...swEngineerProfile,
      jobTypes: ["contract"],
    };
    const { score } = ruleBasedScore(contractOnlyProfile, remoteSwJob);
    // Full-time job against contract-only profile should produce a penalty
    expect(score).toBeLessThan(1.0);
  });
});

// ── buildSummary ────────────────────────────────────────────────────────────

describe("buildSummary", () => {
  it("returns a strong match string for score >= 0.80", () => {
    const summary = buildSummary(0.85, [], []);
    expect(summary).toMatch(/strong match/i);
    expect(summary).toMatch(/85%/);
  });

  it("returns a partial match string for score in [0.55, 0.80)", () => {
    const summary = buildSummary(0.65, [], [{ label: "Location", status: "missing" }]);
    expect(summary).toMatch(/partial match/i);
  });

  it("returns a weak match string for score < 0.55", () => {
    const summary = buildSummary(0.30, [{ label: "Job type", status: "missing" }], []);
    expect(summary).toMatch(/weak match/i);
  });
});

// ── buildMatchBreakdown ─────────────────────────────────────────────────────

describe("buildMatchBreakdown", () => {
  it("blends embedding score when provided", () => {
    const { score: ruleOnly } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    const embeddingScore = 0.95;
    const blended = buildMatchBreakdown(swEngineerProfile, remoteSwJob, embeddingScore);
    // 70% embedding + 30% rule
    const expected = Math.round((embeddingScore * 0.7 + ruleOnly * 0.3) * 100) / 100;
    expect(blended.score).toBe(expected);
  });

  it("uses rule score when no embedding provided", () => {
    const { score: ruleOnly } = ruleBasedScore(swEngineerProfile, remoteSwJob);
    const breakdown = buildMatchBreakdown(swEngineerProfile, remoteSwJob);
    expect(breakdown.score).toBe(ruleOnly);
  });

  it("returns a non-empty summary string", () => {
    const breakdown = buildMatchBreakdown(swEngineerProfile, remoteSwJob);
    expect(typeof breakdown.summary).toBe("string");
    expect(breakdown.summary.length).toBeGreaterThan(0);
  });
});
