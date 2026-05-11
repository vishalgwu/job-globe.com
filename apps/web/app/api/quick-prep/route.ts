import crypto from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { resolveRequestUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PrepContent {
  company_research_tips: string[];
  likely_interview_questions: string[];
  skills_to_highlight: string[];
  preparation_checklist: string[];
  red_flags: string[];
}

// ── GET /api/quick-prep?jobId=<uuid> ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId query parameter is required." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // 1. Load job from jobs_canonical
  const { data: job, error: jobError } = await supabase
    .from("jobs_canonical")
    .select("title, required_skills, employment_type, remote_type, seniority")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    console.error("[quick-prep] job fetch failed:", jobError.message);
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // 2. Resolve optional user + profile
  let userId: string | null = null;
  let profileContext = "";
  try {
    const user = await resolveRequestUser(request);
    if (user) {
      userId = user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_remote_type, skills")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        const skills = Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : "";
        const remotePreference = profile.preferred_remote_type ?? "not specified";
        profileContext = `\nCandidate skills: ${skills || "not specified"}.
Candidate remote preference: ${remotePreference}.`;
      }
    }
  } catch {
    // Non-fatal — continue without profile context
  }

  const requiredSkills = Array.isArray(job.required_skills)
    ? (job.required_skills as string[]).join(", ")
    : typeof job.required_skills === "string"
      ? (job.required_skills as string)
      : "not specified";

  const userPrompt = `Job title: ${job.title}
Employment type: ${job.employment_type ?? "not specified"}
Remote type: ${job.remote_type ?? "not specified"}
Seniority: ${job.seniority ?? "not specified"}
Required skills: ${requiredSkills}${profileContext}`;
  const promptHash = crypto.createHash("sha256").update(userPrompt).digest("hex");

  // 3. Check cache
  const now = new Date().toISOString();
  let cacheQuery = supabase
    .from("quick_prep_cache")
    .select("content, user_id")
    .eq("job_id", jobId)
    .eq("prompt_hash", promptHash)
    .gt("expires_at", now)
    .order("user_id", { ascending: false, nullsFirst: false })
    .limit(1);

  if (userId) {
    // Prefer user-specific cache, fall back to anonymous
    cacheQuery = supabase
      .from("quick_prep_cache")
      .select("content, user_id")
      .eq("job_id", jobId)
      .eq("prompt_hash", promptHash)
      .gt("expires_at", now)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("user_id", { ascending: false, nullsFirst: false })
      .limit(1);
  } else {
    cacheQuery = supabase
      .from("quick_prep_cache")
      .select("content, user_id")
      .eq("job_id", jobId)
      .eq("prompt_hash", promptHash)
      .is("user_id", null)
      .gt("expires_at", now)
      .limit(1);
  }

  const { data: cacheRow } = await cacheQuery;
  if (cacheRow && cacheRow.length > 0) {
    return NextResponse.json({ cached: true, content: cacheRow[0].content as PrepContent });
  }

  // 4. Cache miss — call OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured on this server." },
      { status: 503 },
    );
  }

  const client = new OpenAI({ apiKey: openaiKey });

  let content: PrepContent;
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a career coach. Given this job, generate interview prep content as JSON with these keys:
company_research_tips (array of 3 strings),
likely_interview_questions (array of 5 strings),
skills_to_highlight (array from job skills),
preparation_checklist (array of 4 actionable items),
red_flags (array of 0-2 strings, or empty).`,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty response from OpenAI.");
    }
    content = JSON.parse(raw) as PrepContent;
  } catch (err) {
    console.error("[quick-prep] OpenAI call failed:", err);
    return NextResponse.json(
      { error: "Failed to generate prep content. Please try again later." },
      { status: 503 },
    );
  }

  // 5. Store in cache (expires in 24 hours)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase.from("quick_prep_cache").insert({
      job_id: jobId,
      user_id: userId,
      content,
      model: "gpt-4o-mini",
      prompt_hash: promptHash,
      expires_at: expiresAt,
    });
  } catch (insertErr) {
    // Non-fatal — still return the content
    console.warn("[quick-prep] cache insert failed:", insertErr);
  }

  return NextResponse.json({ cached: false, content });
}
