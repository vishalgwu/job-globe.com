/**
 * Lightweight in-process counters for operational metrics.
 *
 * These counters reset on each Vercel function cold start. They are
 * intended for local/staging visibility — not a replacement for a
 * proper time-series metrics backend.
 *
 * Read via GET /api/health (included in the checks response).
 */

interface Counter {
  name: string;
  value: number;
  lastIncrementedAt: string | null;
}

const counters = new Map<string, Counter>();

export function increment(name: string, by = 1): void {
  const existing = counters.get(name);
  if (existing) {
    existing.value += by;
    existing.lastIncrementedAt = new Date().toISOString();
  } else {
    counters.set(name, {
      name,
      value: by,
      lastIncrementedAt: new Date().toISOString(),
    });
  }
}

export function getCounters(): Counter[] {
  return Array.from(counters.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function resetCounter(name: string): void {
  counters.delete(name);
}

// Named counters used across route handlers
export const MetricNames = {
  JOBS_REQUESTS: "api.jobs.requests",
  JOBS_ERRORS: "api.jobs.errors",
  PROFILE_SAVES: "api.profile.saves",
  PROFILE_ERRORS: "api.profile.errors",
  ALERTS_CREATED: "api.alerts.created",
  ALERTS_ERRORS: "api.alerts.errors",
  APPLICATIONS_RECORDED: "api.applications.recorded",
  RESUME_UPLOADS: "api.resume.uploads",
  RESUME_ERRORS: "api.resume.errors",
  AUTH_SESSION_CHECKS: "api.auth.session.checks",
  AUTH_UNAUTHORIZED: "api.auth.unauthorized",
} as const;
