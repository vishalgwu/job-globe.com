import { type NextRequest, NextResponse } from "next/server";

import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ── GET /api/notifications ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[notifications] GET failed:", error.message);
      return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    console.error("[notifications] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── PATCH /api/notifications — mark a notification as read ──────────────────

export async function PATCH(request: NextRequest) {
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

  const { id } = body as Record<string, unknown>;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id (string) is required." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[notifications] PATCH failed:", error.message);
      return NextResponse.json({ error: "Failed to mark notification as read." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
