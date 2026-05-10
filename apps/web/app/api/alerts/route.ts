import { type NextRequest, NextResponse } from "next/server";

import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const DAILY_MAX = parseInt(process.env.ALERT_DAILY_MAX_PER_USER ?? "5", 10);

// ── GET /api/alerts ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("alerts")
      .select("id, name, query, minimum_match_score, delivery_channels, active, last_evaluated_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[alerts] GET failed:", error.message);
      return NextResponse.json({ error: "Failed to load alerts." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alerts: data ?? [] });
  } catch (err) {
    console.error("[alerts] GET error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── POST /api/alerts ─────────────────────────────────────────────────────────

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

  const { name, query, minimum_match_score, delivery_channels } = body as Record<string, unknown>;

  // Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (name.trim().length > 120) {
    return NextResponse.json({ error: "name must be 120 characters or fewer." }, { status: 400 });
  }

  const queryObj = (query && typeof query === "object" && !Array.isArray(query))
    ? (query as Record<string, unknown>)
    : {};

  const minScore =
    typeof minimum_match_score === "number" && minimum_match_score >= 0 && minimum_match_score <= 100
      ? Math.round(minimum_match_score)
      : 70;

  const channels: string[] =
    Array.isArray(delivery_channels) &&
    delivery_channels.every((c) => typeof c === "string")
      ? (delivery_channels as string[]).filter((c) => ["email", "in_app"].includes(c))
      : ["in_app"];

  if (channels.length === 0) {
    return NextResponse.json({ error: "At least one delivery channel is required." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Enforce daily-max per user (count active alerts)
    const { count } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("active", true);

    if ((count ?? 0) >= DAILY_MAX) {
      return NextResponse.json(
        { error: `You can have at most ${DAILY_MAX} active alerts.` },
        { status: 422 },
      );
    }

    const { data, error } = await supabase
      .from("alerts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        query: queryObj,
        minimum_match_score: minScore,
        delivery_channels: channels,
        active: true,
      })
      .select("id, name, query, minimum_match_score, delivery_channels, active, created_at")
      .single();

    if (error) {
      console.error("[alerts] POST insert failed:", error.message);
      return NextResponse.json({ error: "Failed to create alert." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alert: data }, { status: 201 });
  } catch (err) {
    console.error("[alerts] POST error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── DELETE /api/alerts?id=<uuid> ─────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query parameter is required." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Scoped to the requesting user — prevents deleting others' alerts

    if (error) {
      console.error("[alerts] DELETE failed:", error.message);
      return NextResponse.json({ error: "Failed to delete alert." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[alerts] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ── PATCH /api/alerts?id=<uuid> — pause / resume ─────────────────────────────

export async function PATCH(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query parameter is required." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { active } = body as Record<string, unknown>;
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("alerts")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, active")
      .single();

    if (error) {
      console.error("[alerts] PATCH failed:", error.message);
      return NextResponse.json({ error: "Failed to update alert." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alert: data });
  } catch (err) {
    console.error("[alerts] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
