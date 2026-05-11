import { type NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "@/lib/audit/events";
import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// ── DELETE /api/account — full account deletion ──────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Step 1: Delete saved_jobs
  {
    const { error } = await supabase.from("saved_jobs").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] saved_jobs delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 2: Delete applications
  {
    const { error } = await supabase.from("applications").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] applications delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 3: Delete alerts (table is "alerts" in schema)
  {
    const { error } = await supabase.from("alerts").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] alerts delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 4: Delete alert_deliveries
  {
    const { error } = await supabase.from("alert_deliveries").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] alert_deliveries delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 5: Delete notifications
  {
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] notifications delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 6: Delete quick_prep_cache (user-owned rows only)
  {
    const { error } = await supabase
      .from("quick_prep_cache")
      .delete()
      .not("user_id", "is", null)
      .eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] quick_prep_cache delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 7: Delete profile_embeddings (via profile FK)
  {
    const { error } = await supabase.rpc("delete_profile_embeddings_for_user", {
      p_user_id: user.id,
    });
    // RPC may not exist — fall back to subquery-style delete via profiles join
    if (error) {
      // Attempt direct delete using a subquery filter
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id);
      const profileIds = (profileRows ?? []).map((r: { id: string }) => r.id);
      if (profileIds.length > 0) {
        const { error: embErr } = await supabase
          .from("profile_embeddings")
          .delete()
          .in("profile_id", profileIds);
        if (embErr) {
          console.error("[account/delete] profile_embeddings delete failed:", embErr.message);
          return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
        }
      }
    }
  }

  // Step 8: Delete profiles
  {
    const { error } = await supabase.from("profiles").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] profiles delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 9: Delete resume_extractions
  {
    const { error } = await supabase.from("resume_extractions").delete().eq("user_id", user.id);
    if (error) {
      console.error("[account/delete] resume_extractions delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }
  }

  // Step 10: Delete the Supabase Auth user (uses service-role client)
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.authId);
  if (authDeleteError) {
    console.error("[account/delete] auth.admin.deleteUser failed:", authDeleteError.message);
    return NextResponse.json({ error: "Failed to delete auth account." }, { status: 500 });
  }

  // Step 11: Record audit event (best effort — auth user is gone, DB row may remain briefly)
  await recordAuditEvent(supabase, request, {
    actorUserId: user.id,
    eventType: "account.deleted",
    subjectType: "user",
    subjectId: user.id,
    metadata: {},
  });

  return NextResponse.json({ deleted: true });
}

// ── GET /api/account — data export ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  try {
    const [
      profilesResult,
      resumeExtractionsResult,
      savedJobsResult,
      applicationsResult,
      alertsResult,
      notificationsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id),
      supabase.from("resume_extractions").select("*").eq("user_id", user.id),
      supabase.from("saved_jobs").select("*").eq("user_id", user.id),
      supabase.from("applications").select("*").eq("user_id", user.id),
      supabase
        .from("alerts")
        .select("id, name, query, minimum_match_score, delivery_channels, active, last_evaluated_at, created_at")
        .eq("user_id", user.id),
      supabase
        .from("notifications")
        .select("id, type, title, body, job_id, alert_id, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    // Omit parsed_profile.rawText from resume_extractions
    const resumeExtractions = (resumeExtractionsResult.data ?? []).map((row) => {
      if (
        row.parsed_profile &&
        typeof row.parsed_profile === "object" &&
        !Array.isArray(row.parsed_profile)
      ) {
        const rest = { ...(row.parsed_profile as Record<string, unknown>) };
        delete rest.rawText;
        return { ...row, parsed_profile: rest };
      }
      return row;
    });

    await recordAuditEvent(supabase, request, {
      actorUserId: user.id,
      eventType: "account.export_requested",
      subjectType: "user",
      subjectId: user.id,
      metadata: {},
    });

    return NextResponse.json({
      profiles: profilesResult.data ?? [],
      resume_extractions: resumeExtractions,
      saved_jobs: savedJobsResult.data ?? [],
      applications: applicationsResult.data ?? [],
      alerts: alertsResult.data ?? [],
      notifications: notificationsResult.data ?? [],
    });
  } catch (err) {
    console.error("[account/export] error:", err);
    return NextResponse.json({ error: "Failed to export account data." }, { status: 500 });
  }
}
