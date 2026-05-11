import { type NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/audit/events";
import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam ?? "50", 10), 200);

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("applications")
      .select("id, job_id, apply_url, status, applied_at, metadata")
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[applications] GET failed:", error.message);
      return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, applications: data ?? [] });
  } catch (err) {
    console.error("[applications] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { job_id, apply_url } = body as Record<string, unknown>;

  if (!job_id || typeof job_id !== "string") {
    return NextResponse.json({ error: "job_id is required." }, { status: 400 });
  }
  if (!apply_url || typeof apply_url !== "string") {
    return NextResponse.json({ error: "apply_url is required." }, { status: 400 });
  }

  let parsedApplyUrl: URL;
  try {
    parsedApplyUrl = new URL(apply_url);
    if (!["http:", "https:"].includes(parsedApplyUrl.protocol)) {
      return NextResponse.json({ error: "apply_url must be http or https." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "apply_url must be a valid URL." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("applications")
      .upsert(
        {
          user_id: user.id,
          job_id,
          apply_url,
          status: "redirected",
          applied_at: new Date().toISOString(),
          metadata: {},
        },
        { onConflict: "user_id,job_id" },
      )
      .select("id, job_id, apply_url, status, applied_at")
      .single();

    if (error) {
      console.error("[applications] POST upsert failed:", error.message);
      return NextResponse.json({ error: "Failed to record application." }, { status: 500 });
    }

    await recordAuditEvent(supabase, request, {
      actorUserId: user.id,
      eventType: "application.redirected",
      subjectType: "job",
      subjectId: job_id,
      metadata: {
        applicationId: data.id,
        applyHost: parsedApplyUrl.hostname,
        status: data.status,
      },
    });

    return NextResponse.json({ ok: true, application: data }, { status: 201 });
  } catch (err) {
    console.error("[applications] POST error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
