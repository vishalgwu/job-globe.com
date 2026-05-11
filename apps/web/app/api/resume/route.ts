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
 *   - Full parsed resume text is not retained after structured parsing.
 */

import crypto from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { recordAuditEvent } from "../../../lib/audit/events";
import { resolveRequestUser } from "../../../lib/supabase/auth";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

const RESUME_BUCKET = "resumes";
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes
const SUPPORTED_RESUME_EXTENSIONS = new Set(["pdf", "docx", "txt"]);
const SUPPORTED_RESUME_MIME_TYPES: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf", "application/octet-stream"]),
  docx: new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ]),
  txt: new Set(["text/plain", "application/octet-stream"]),
};

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
  const extension = (originalName.split(".").pop() ?? "").toLowerCase();
  if (!isSupportedResumeUpload(extension, file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload PDF, DOCX, or TXT." },
      { status: 400 },
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds the 10 MB size limit." }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

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
          raw_file_sha256: null,
          encrypted_at: new Date().toISOString(),
          raw_delete_after: rawDeleteAfter,
          parser_version: "phase-4",
          parsed_text: null,
          parsed_at: null,
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

// ── GET: signed URL + parse status ─────────────────────────────────────────
//
// parseStatus values:
//   "none"       — no resume on file (no extractions row)
//   "pending"    — raw file uploaded, parser has not yet run
//   "done"       — parsed_at is set; parsed_profile is available

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const supabase = createServerSupabaseClient();

    const { data: row } = await supabase
      .from("resume_extractions")
      .select("raw_object_key, raw_delete_after, created_at, parsed_at, parsed_profile, confidence")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ resume: null, parseStatus: "none" });
    }

    // Determine parse status
    const parseStatus: "pending" | "done" = row.parsed_at ? "done" : "pending";

    // Only produce a signed URL if a raw file still exists on storage
    let signedUrl: string | null = null;
    if (row.raw_object_key) {
      const { data: signedData } = await supabase.storage
        .from(RESUME_BUCKET)
        .createSignedUrl(row.raw_object_key, SIGNED_URL_TTL_SECONDS);
      signedUrl = signedData?.signedUrl ?? null;
    }

    return NextResponse.json({
      resume: {
        signedUrl,
        rawDeleteAfter: row.raw_delete_after,
        uploadedAt: row.created_at,
        hasRawFile: Boolean(row.raw_object_key),
      },
      parseStatus,
      parsedAt: row.parsed_at ?? null,
      // Expose a lightweight parsed summary — not the full profile object.
      // Full profile data is available via /api/profile.
      parsedSummary: row.parsed_at
        ? {
            hasName: Boolean(
              row.parsed_profile &&
                typeof row.parsed_profile === "object" &&
                !Array.isArray(row.parsed_profile) &&
                (row.parsed_profile as Record<string, unknown>).name,
            ),
            skillCount: Array.isArray(
              (row.parsed_profile as Record<string, unknown> | null)?.skills,
            )
              ? ((row.parsed_profile as Record<string, unknown>).skills as unknown[]).length
              : 0,
          }
        : null,
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

    // Null out raw-file metadata. Structured extraction may remain.
    const { error: updateError } = await supabase
      .from("resume_extractions")
      .update({
        raw_object_key: null,
        raw_file_sha256: null,
        raw_delete_after: null,
        parsed_text: null,
        user_retained: false,
      })
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

function isSupportedResumeUpload(extension: string, contentType: string): boolean {
  if (!SUPPORTED_RESUME_EXTENSIONS.has(extension)) {
    return false;
  }
  if (!contentType) {
    return true;
  }
  return SUPPORTED_RESUME_MIME_TYPES[extension]?.has(contentType) === true;
}
