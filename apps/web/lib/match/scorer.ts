/**
 * Profile-to-job match scorer.
 *
 * Strategy (in priority order):
 *   1. Embedding cosine similarity — if both profile_embeddings and
 *      job_embeddings rows exist, compute cosine similarity for the score.
 *   2. Rule-based fallback — compare profile fields to job attributes and
 *      produce a 0–1 score from weighted signal hits.
 *
 * Returns a MatchBreakdown that the UI can render immediately.
 */

import type { MatchBreakdown, MatchSignal } from "@job-globe/shared-types";

// ── Cosine similarity ──────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Rule-based scoring ─────────────────────────────────────────────────────

export interface ProfileSnapshot {
  desiredRoleFamily: string;
  targetLocations: string[];
  remotePreference: string;
  jobTypes: string[];
  salarySensitivity?: string | null;
}

export interface JobSnapshot {
  title: string;
  remote_type?: string | null;
  employment_type?: string | null;
  seniority?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  taxonomy_functions?: string[];
}

const REMOTE_COMPAT: Record<string, string[]> = {
  remote: ["remote"],
  hybrid: ["hybrid", "remote"],
  "on-site": ["on-site", "hybrid"],
  flexible: ["remote", "hybrid", "on-site"],
};

function normaliseRoleText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/[^\w\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ruleBasedScore(
  profile: ProfileSnapshot,
  job: JobSnapshot,
): { score: number; strengths: MatchSignal[]; gaps: MatchSignal[] } {
  const strengths: MatchSignal[] = [];
  const gaps: MatchSignal[] = [];

  // ── Remote type match (weight 0.30) ─────────────────────────────────────
  const compat = REMOTE_COMPAT[profile.remotePreference] ?? [];
  if (job.remote_type && compat.includes(job.remote_type)) {
    strengths.push({ label: "Remote preference", status: "strong" });
  } else if (job.remote_type) {
    gaps.push({ label: "Remote preference", status: "missing" });
  } else {
    strengths.push({ label: "Remote preference", status: "partial" });
  }

  // ── Location match (weight 0.20) ─────────────────────────────────────────
  if (job.remote_type === "remote") {
    strengths.push({ label: "Location", status: "strong" });
  } else {
    const jobLocation = [job.location_city, job.location_country]
      .filter(Boolean)
      .join(", ")
      .toLowerCase();
    const locationHit = profile.targetLocations.some((loc) =>
      jobLocation.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLocation),
    );
    if (locationHit) {
      strengths.push({ label: "Location", status: "strong" });
    } else if (profile.targetLocations.length === 0) {
      strengths.push({ label: "Location", status: "partial" });
    } else {
      gaps.push({ label: "Location", status: "missing" });
    }
  }

  // ── Job type match (weight 0.20) ──────────────────────────────────────────
  if (job.employment_type && profile.jobTypes.includes(job.employment_type)) {
    strengths.push({ label: "Job type", status: "strong" });
  } else if (job.employment_type) {
    gaps.push({ label: "Job type", status: "partial" });
  } else {
    strengths.push({ label: "Job type", status: "partial" });
  }

  // ── Role family / taxonomy (weight 0.30) ─────────────────────────────────
  const roleFamilyNorm = normaliseRoleText(profile.desiredRoleFamily);
  const titleNorm = normaliseRoleText(job.title);
  const taxFns = (job.taxonomy_functions ?? []).map(normaliseRoleText);

  const roleHit =
    titleNorm.includes(roleFamilyNorm) ||
    taxFns.some((fn) => fn.includes(roleFamilyNorm) || roleFamilyNorm.includes(fn));

  if (roleHit) {
    strengths.push({ label: "Role family", status: "strong" });
  } else {
    gaps.push({ label: "Role family", status: "partial" });
  }

  // ── Weighted score ────────────────────────────────────────────────────────
  const WEIGHTS: Record<string, number> = {
    "Remote preference": 0.3,
    Location: 0.2,
    "Job type": 0.2,
    "Role family": 0.3,
  };

  let score = 0;
  for (const signal of strengths) {
    const w = WEIGHTS[signal.label] ?? 0;
    score += signal.status === "strong" ? w : w * 0.5;
  }

  return { score: Math.round(score * 100) / 100, strengths, gaps };
}

// ── Summary text generator ─────────────────────────────────────────────────

export function buildSummary(score: number, strengths: MatchSignal[], gaps: MatchSignal[]): string {
  const pct = Math.round(score * 100);

  if (pct >= 80) {
    return `Strong match (${pct}%). This role aligns well with your preferences.`;
  }

  if (pct >= 55) {
    const gapLabels = gaps.map((g) => g.label.toLowerCase()).join(" and ");
    return `Partial match (${pct}%). ${gapLabels ? `Potential gaps: ${gapLabels}.` : ""}`;
  }

  const topGap = gaps[0]?.label?.toLowerCase() ?? "multiple criteria";
  return `Weak match (${pct}%). Key difference: ${topGap}.`;
}

// ── Full breakdown builder ─────────────────────────────────────────────────

export function buildMatchBreakdown(
  profile: ProfileSnapshot,
  job: JobSnapshot,
  embeddingScore?: number | null,
): MatchBreakdown {
  const { score: ruleScore, strengths, gaps } = ruleBasedScore(profile, job);

  // If an embedding-based score is available, blend it (70% embedding, 30% rule)
  const finalScore =
    embeddingScore != null
      ? Math.round((embeddingScore * 0.7 + ruleScore * 0.3) * 100) / 100
      : ruleScore;

  return {
    score: finalScore,
    summary: buildSummary(finalScore, strengths, gaps),
    strengths,
    gaps,
  };
}
