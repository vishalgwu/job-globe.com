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

  checks.push({
    name: "environment",
    status: supabaseConfig.configured ? "ok" : "error",
    detail: supabaseConfig.configured
      ? "Supabase server environment is configured."
      : `Missing ${supabaseConfig.missing.join(", ")}.`,
  });

  if (supabaseConfig.configured) {
    const supabase = createServerSupabaseClient();

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
  }

  const healthy = checks.every((check) => check.status === "ok");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      service: "job-globe-web",
      checkedAt: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
