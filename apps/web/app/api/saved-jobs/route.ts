/**
 * /api/saved-jobs
 *
 * GET    — list all saved jobs for the authenticated user.
 * POST   — save a job (body: { jobId: string }).
 * DELETE — remove a saved job (query: ?jobId=xxx).
 *
 * All operations require authentication — returns 401 for unauthenticated requests.
 */

import { type NextRequest, NextResponse } from "next/server";

import { resolveRequestUser } from "../../../lib/supabase/auth";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

// ── GET: list saved jobs ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("saved_jobs")
      .select(
        `
        job_id,
        notes,
        saved_at,
        jobs_canonical (
          id,
          title,
          employment_type,
          remote_type,
          seniority,
          apply_url,
          companies ( name, logo_url ),
          locations ( city, country_name )
        )
      `,
      )
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (error) {
      console.error("saved_jobs GET error", error);
      return NextResponse.json({ error: "Failed to fetch saved jobs." }, { status: 500 });
    }

    return NextResponse.json({ savedJobs: data ?? [] });
  } catch (err) {
    console.error("saved_jobs GET error", err);
    return NextResponse.json({ error: "Failed to fetch saved jobs." }, { status: 500 });
  }
}

// ── POST: save a job ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as Record<string, unknown>).jobId !== "string"
  ) {
    return NextResponse.json({ error: "Body must include a jobId string." }, { status: 400 });
  }

  const jobId = (payload as Record<string, string>).jobId;
  const notes = typeof (payload as Record<string, unknown>).notes === "string"
    ? (payload as Record<string, string>).notes
    : null;

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("saved_jobs")
      .upsert({ user_id: user.id, job_id: jobId, notes }, { onConflict: "user_id,job_id" });

    if (error) {
      console.error("saved_jobs POST error", error);
      return NextResponse.json({ error: "Failed to save job." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    console.error("saved_jobs POST error", err);
    return NextResponse.json({ error: "Failed to save job." }, { status: 500 });
  }
}

// ── DELETE: remove a saved job ─────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId query parameter." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId);

    if (error) {
      console.error("saved_jobs DELETE error", error);
      return NextResponse.json({ error: "Failed to remove saved job." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, jobId });
  } catch (err) {
    console.error("saved_jobs DELETE error", err);
    return NextResponse.json({ error: "Failed to remove saved job." }, { status: 500 });
  }
}
