import { type NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import Redis from "ioredis";

export const runtime = "nodejs";

// Reject webhooks older than 5 minutes to prevent replay attacks.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Greenhouse sends a `Timestamp` header containing Unix epoch seconds.
 * Returns true if the timestamp is within TIMESTAMP_TOLERANCE_SECONDS of now.
 * If no header is present we allow the request through (header is optional on
 * ping events) — the HMAC is the primary security control.
 */
function isTimestampFresh(timestampHeader: string | null): boolean {
  if (!timestampHeader) return true;
  const ts = parseInt(timestampHeader, 10);
  if (isNaN(ts)) return false;
  const ageSecs = Math.abs(Date.now() / 1_000 - ts);
  return ageSecs <= TIMESTAMP_TOLERANCE_SECONDS;
}

interface GreenhouseJobPost {
  title?: string;
  content?: string;
  absolute_url?: string;
  internal_job_id?: string | number;
  location?: { name?: string };
}

interface GreenhouseWebhookBody {
  action?: string;
  payload?: {
    job_post?: GreenhouseJobPost;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  // 1. Read raw body for signature verification
  const body = await request.text();

  // 2. Verify HMAC-SHA256 signature
  const secret = process.env.GREENHOUSE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/greenhouse] GREENHOUSE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("Signature") ?? "";
  if (!verifySignature(secret, body, signature)) {
    console.warn("[webhook/greenhouse] Signature mismatch.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2b. Replay protection — reject stale webhooks.
  const timestampHeader = request.headers.get("Timestamp");
  if (!isTimestampFresh(timestampHeader)) {
    console.warn("[webhook/greenhouse] Stale webhook rejected (timestamp out of tolerance).");
    return NextResponse.json({ error: "Stale webhook." }, { status: 401 });
  }

  // 3. Parse JSON payload
  let parsed: GreenhouseWebhookBody;
  try {
    parsed = JSON.parse(body) as GreenhouseWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = parsed.action ?? "";

  // 4. Handle "ping"
  if (action === "ping") {
    return NextResponse.json({ ok: true });
  }

  // 5. Handle "job_post.created"
  if (action === "job_post.created") {
    const jobPost = parsed.payload?.job_post ?? ({} as GreenhouseJobPost);

    const title = jobPost.title ?? "";
    const description = jobPost.content ?? "";
    const applyUrl = jobPost.absolute_url ?? "";
    const sourceJobId = String(jobPost.internal_job_id ?? "");
    const locationRaw = jobPost.location?.name ?? "";

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error("[webhook/greenhouse] REDIS_URL is not configured.");
      return NextResponse.json({ error: "Redis not configured." }, { status: 500 });
    }

    let redis: Redis | null = null;
    try {
      redis = new Redis(redisUrl);
      await redis.xadd(
        "job-globe.discovery",
        "*",
        "source", "greenhouse",
        "title", title,
        "description", description,
        "apply_url", applyUrl,
        "source_job_id", sourceJobId,
        "location_raw", locationRaw,
      );
    } catch (err) {
      console.error("[webhook/greenhouse] Redis xadd failed:", err);
      return NextResponse.json({ error: "Failed to publish job to stream." }, { status: 500 });
    } finally {
      if (redis) {
        redis.disconnect();
      }
    }

    return NextResponse.json({ ok: true });
  }

  // 6. Other actions — log and acknowledge
  console.log("[webhook/greenhouse] Ignoring unhandled action:", action);
  return NextResponse.json({ ok: true, action: "ignored" });
}
