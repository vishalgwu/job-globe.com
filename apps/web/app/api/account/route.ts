import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { recordAuditEvent } from "@/lib/audit/events";
import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RESUME_BUCKET = "resumes";
const STORAGE_REMOVE_BATCH_SIZE = 100;

// ── DELETE /api/account — full account deletion ──────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  try {
    const resumeObjectKeys = await collectResumeObjectKeys(supabase, user.id);
    await removeResumeObjects(supabase, resumeObjectKeys);

    await recordAuditEvent(supabase, request, {
      actorUserId: user.id,
      eventType: "account.deleted",
      subjectType: "user",
      subjectId: user.id,
      metadata: { storageObjectsDeleted: resumeObjectKeys.length },
    });

    const { data: deleted, error: dbDeleteError } = await supabase.rpc("delete_internal_account", {
      p_user_id: user.id,
    });
    if (dbDeleteError || deleted !== true) {
      console.error("[account/delete] delete_internal_account failed:", dbDeleteError?.message);
      return NextResponse.json({ error: "Failed to delete account data." }, { status: 500 });
    }

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.authId);
    if (authDeleteError) {
      console.error("[account/delete] auth.admin.deleteUser failed:", authDeleteError.message);
      return NextResponse.json({ error: "Failed to delete auth account." }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[account/delete] error:", err);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
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
      supabase
        .from("resume_extractions")
        .select(
          "id, user_id, raw_delete_after, parsed_at, parsed_profile, confidence, parser_version, created_at",
        )
        .eq("user_id", user.id),
      supabase.from("saved_jobs").select("*").eq("user_id", user.id),
      supabase.from("applications").select("*").eq("user_id", user.id),
      supabase
        .from("alerts")
        .select(
          "id, name, query, minimum_match_score, delivery_channels, active, last_evaluated_at, created_at",
        )
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

async function collectResumeObjectKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const keys = new Set<string>();

  const { data: rows, error } = await supabase
    .from("resume_extractions")
    .select("raw_object_key")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to load resume object keys: ${error.message}`);
  }

  for (const row of rows ?? []) {
    const rawKey = (row as { raw_object_key?: unknown }).raw_object_key;
    if (typeof rawKey === "string") {
      const key = normaliseResumeObjectKey(rawKey, userId);
      if (key) keys.add(key);
    }
  }

  const listedKeys = await listResumeObjectsForUser(supabase, userId);
  for (const key of listedKeys) {
    keys.add(key);
  }

  return Array.from(keys);
}

async function listResumeObjectsForUser(
  supabase: SupabaseClient,
  userId: string,
  prefix = userId,
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error) {
    throw new Error(`Failed to list resume storage objects: ${error.message}`);
  }

  const keys: string[] = [];
  for (const item of data ?? []) {
    if (!item.name) continue;
    const key = `${prefix}/${item.name}`;
    if (item.id === null) {
      keys.push(...(await listResumeObjectsForUser(supabase, userId, key)));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

async function removeResumeObjects(supabase: SupabaseClient, objectKeys: string[]): Promise<void> {
  for (let i = 0; i < objectKeys.length; i += STORAGE_REMOVE_BATCH_SIZE) {
    const batch = objectKeys.slice(i, i + STORAGE_REMOVE_BATCH_SIZE);
    if (batch.length === 0) continue;

    const { error } = await supabase.storage.from(RESUME_BUCKET).remove(batch);
    if (error) {
      throw new Error(`Failed to delete resume storage objects: ${error.message}`);
    }
  }
}

function normaliseResumeObjectKey(rawKey: string, userId: string): string | null {
  let key = rawKey.trim().replace(/^\/+/, "");
  if (key.startsWith(`${RESUME_BUCKET}/`)) {
    key = key.slice(RESUME_BUCKET.length + 1);
  }
  return key.startsWith(`${userId}/`) ? key : null;
}
