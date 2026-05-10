/**
 * Structured logger for API routes.
 *
 * In production, these lines are emitted to stdout where the hosting platform
 * (Vercel, etc.) picks them up. Each log line is a JSON object so log
 * aggregators can filter and alert on specific fields.
 *
 * Usage:
 *   import { log } from "@/lib/observability/logger";
 *   log.info("profile.get", { userId, durationMs });
 *   log.error("jobs.detail", { jobId, error: err.message });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  route: string;
  ts: string;
  env: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, route: string, fields: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    route,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    ...fields,
  };

  // In test mode suppress logs so vitest output is clean.
  if (process.env.NODE_ENV === "test") return;

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (route: string, fields?: Record<string, unknown>) => emit("info", route, fields),
  warn: (route: string, fields?: Record<string, unknown>) => emit("warn", route, fields),
  error: (route: string, fields?: Record<string, unknown>) => emit("error", route, fields),
};

/**
 * Wraps a route handler to automatically log duration and errors.
 *
 * Usage:
 *   export const GET = withObservability("jobs.get", async (request) => { ... });
 */
export function withObservability<T extends (...args: never[]) => Promise<Response>>(
  route: string,
  handler: T,
): T {
  return (async (...args: Parameters<T>) => {
    const start = Date.now();
    try {
      const result = await handler(...args);
      const durationMs = Date.now() - start;
      if (!result.ok) {
        log.warn(route, { status: result.status, durationMs });
      } else {
        log.info(route, { status: result.status, durationMs });
      }
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      log.error(route, {
        durationMs,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }) as T;
}
