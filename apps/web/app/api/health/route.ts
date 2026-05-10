import { NextResponse } from "next/server";

import { createServerSupabaseClient, getSupabaseConfigStatus } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface HealthCheck {
  name: string;
  status: "ok" | "error";
  detail?: string;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const supabaseConfig = getSupabaseConfigStatus();
  const startedAt = Date.now();

  // ── 1. Environment ──────────────────────────────────────────────────────────
  checks.push({
    name: "environment",
    status: supabaseConfig.configured ? "ok" : "error",
    detail: supabaseConfig.configured
      ? "Supabase server environment is configured."
      : `Missing: ${supabaseConfig.missing.join(", ")}.`,
  });

  if (supabaseConfig.configured) {
    const supabase = createServerSupabaseClient();

    // ── 2. Supabase jobs table ────────────────────────────────────────────────
    const jobsResult = await supabase
      .from("jobs_canonical")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    checks.push({
      name: "supabase.jobs",
      status: jobsResult.error ? "error" : "ok",
      detail: jobsResult.error
        ? jobsResult.error.message
        : `${jobsResult.count ?? 0} active job records reachable.`,
    });

    // ── 3. Supabase migrations history ───────────────────────────────────────
    const migrationsResult = await supabase
      .from("schema_migrations")
      .select("version", { count: "exact", head: true });

    checks.push({
      name: "supabase.migrations",
      status: migrationsResult.error ? "error" : "ok",
      detail: migrationsResult.error
        ? migrationsResult.error.message
        : `${migrationsResult.count ?? 0} migration records tracked.`,
    });

    // ── 4. Auth service reachability ─────────────────────────────────────────
    try {
      const { error: authError } = await supabase.auth.getSession();
      checks.push({
        name: "supabase.auth",
        status: authError ? "error" : "ok",
        detail: authError ? authError.message : "Auth service reachable.",
      });
    } catch (e) {
      checks.push({
        name: "supabase.auth",
        status: "error",
        detail: e instanceof Error ? e.message : "Auth service unreachable.",
      });
    }

    // ── 5. Storage service reachability ──────────────────────────────────────
    try {
      const { error: storageError } = await supabase.storage.listBuckets();
      checks.push({
        name: "supabase.storage",
        status: storageError ? "error" : "ok",
        detail: storageError ? storageError.message : "Storage service reachable.",
      });
    } catch (e) {
      checks.push({
        name: "supabase.storage",
        status: "error",
        detail: e instanceof Error ? e.message : "Storage service unreachable.",
      });
    }
  }

  const healthy = checks.every((check) => check.status === "ok");
  const durationMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      service: "job-globe-web",
      checkedAt: new Date().toISOString(),
      durationMs,
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
