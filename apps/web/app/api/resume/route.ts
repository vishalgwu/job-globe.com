/**
 * /api/resume
 *
 * POST   — upload a resume file to Supabase Storage (private bucket: "resumes").
 *          Creates / updates a resume_extractions row with raw_delete_after set
 *          to now + RESUME_RAW_RETENTION_DAYS (default 30).
 *          Returns a short-lived signed URL for the uploaded file.
 *
 * GET    — return a fresh signed URL for the authenticated user's current resume.
 *
 * DELETE — remove the raw file from storage and null out the object key
 *          (parsed extraction row is retained per privacy policy).
 *
 * Privacy policy compliance (docs/decisions/privacy-framework.md):
 *   - Raw files are never public. All access is via signed URLs.
 *   - raw_delete_after enforces the 30-day retention window.
 *   - Parsed text is kept in resume_extractions even after raw deletion.
 */

import crypto from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "../../../lib/audit/events";
import { resolveRequestUser } from "../../../lib/supabase/auth";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const RESUME_BUCKET = "resumes";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

// ── POST: upload ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file field in form data." }, { status: 400 });
  }

  const originalName = file instanceof File ? file.name : "resume";
  const extension = originalName.split(".").pop() ?? "pdf";
  const allowedExtensions = ["pdf", "doc", "docx", "txt", "rtf"];
  if (!allowedExtensions.includes(extension.toLowerCase())) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, DOC, TXT, or RTF." },
      { status: 400 },
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 10 MB size limit." }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // Path: resumes/{userId}/{uuid}.{ext} — scoped to user, no public listing
  const objectKey = `${user.id}/${crypto.randomUUID()}.${extension}`;

  try {
    const supabase = createServerSupabaseClient();

    // Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(objectKey, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("resume upload error", uploadError);
      return NextResponse.json({ error: "Failed to upload resume." }, { status: 500 });
    }

    // Retention deadline
    const retentionDays = Number(process.env.RESUME_RAW_RETENTION_DAYS ?? 30);
    const rawDeleteAfter = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Upsert resume_extractions row (one per user — latest wins)
    const { data: resumeRow, error: dbError } = await supabase
      .from("resume_extractions")
      .upsert(
        {
          user_id: user.id,
          raw_object_key: objectKey,
          raw_file_sha256: sha256,
          encrypted_at: new Date().toISOString(),
          raw_delete_after: rawDeleteAfter,
          parser_version: "phase-4",
          parsed_text: null,
          parsed_profile: {},
          confidence: {},
        },
        { onConflict: "user_id" },
      )
      .select("id, raw_delete_after")
      .single();

    if (dbError || !resumeRow) {
      // Clean up the orphaned storage object
      await supabase.storage.from(RESUME_BUCKET).remove([objectKey]);
      console.error("resume_extractions upsert error", dbError);
      return NextResponse.json({ error: "Failed to record resume upload." }, { status: 500 });
    }

    // Generate a signed URL for immediate preview
    const { data: signedData } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(objectKey, SIGNED_URL_TTL_SECONDS);

    await recordAuditEvent(supabase, request, {
      actorUserId: user.id,
      eventType: "resume.uploaded",
      subjectType: "resume_extraction",
      subjectId: resumeRow.id,
      metadata: {
        contentType: file.type || "application/octet-stream",
        extension: extension.toLowerCase(),
        fileSizeBytes: file.size,
        rawDeleteAfter: resumeRow.raw_delete_after,
        retentionDays,
      },
    });

    return NextResponse.json({
      ok: true,
      fileName: originalName,
      signedUrl: signedData?.signedUrl ?? null,
      rawDeleteAfter,
    });
  } catch (err) {
    console.error("resume POST error", err);
    return NextResponse.json({ error: "Resume upload failed." }, { status: 500 });
  }
}

// ── GET: signed URL ────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: row } = await supabase
      .from("resume_extractions")
      .select("raw_object_key, raw_delete_after, raw_file_sha256, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row || !row.raw_object_key) {
      return NextResponse.json({ resume: null });
    }

    const { data: signedData } = await supabase.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(row.raw_object_key, SIGNED_URL_TTL_SECONDS);

    return NextResponse.json({
      resume: {
        signedUrl: signedData?.signedUrl ?? null,
        rawDeleteAfter: row.raw_delete_after,
        uploadedAt: row.created_at,
      },
    });
  } catch (err) {
    console.error("resume GET error", err);
    return NextResponse.json({ error: "Failed to fetch resume." }, { status: 500 });
  }
}

// ── DELETE: remove raw file ────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: row } = await supabase
      .from("resume_extractions")
      .select("id, raw_object_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row?.raw_object_key) {
      return NextResponse.json({ ok: true, message: "No raw resume on file." });
    }

    // Remove from storage
    const { error: removeError } = await supabase.storage
      .from(RESUME_BUCKET)
      .remove([row.raw_object_key]);

    if (removeError) {
      console.error("resume storage delete error", removeError);
      return NextResponse.json({ error: "Failed to delete resume." }, { status: 500 });
    }

    // Null out the object key — parsed extraction is retained per privacy policy
    const { error: updateError } = await supabase
      .from("resume_extractions")
      .update({ raw_object_key: null })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("resume_extractions delete update error", updateError);
      return NextResponse.json({ error: "Failed to update resume record." }, { status: 500 });
    }

    await recordAuditEvent(supabase, request, {
      actorUserId: user.id,
      eventType: "resume.raw_deleted",
      subjectType: "resume_extraction",
      subjectId: row.id,
      metadata: { rawObjectDeleted: true },
    });

    return NextResponse.json({ ok: true, message: "Raw resume deleted." });
  } catch (err) {
    console.error("resume DELETE error", err);
    return NextResponse.json({ error: "Failed to delete resume." }, { status: 500 });
  }
}
