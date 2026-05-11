import { type NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import Redis from "ioredis";

export const runtime = "nodejs";

function verifySignature(secret: string, body: string, signature: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

interface LeverPosting {
  text?: string;
  descriptionBody?: string;
  urls?: { apply?: string };
  id?: string;
  categories?: { location?: string };
}

interface LeverWebhookBody {
  triggeredAt?: string | number;
  event?: string;
  data?: {
    posting?: LeverPosting;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  // 1. Read raw body for signature verification
  const body = await request.text();

  // 2. Verify HMAC-SHA256 signature
  const secret = process.env.LEVER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook/lever] LEVER_WEBHOOK_SECRET is not configured.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("X-Lever-Signature") ?? "";
  if (!verifySignature(secret, body, signature)) {
    console.warn("[webhook/lever] Signature mismatch.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse JSON payload
  let parsed: LeverWebhookBody;
  try {
    parsed = JSON.parse(body) as LeverWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event = parsed.event ?? "";

  // 4. Handle "postingPublish"
  if (event === "postingPublish") {
    const posting = parsed.data?.posting ?? ({} as LeverPosting);

    const title = posting.text ?? "";
    const description = posting.descriptionBody ?? "";
    const applyUrl = posting.urls?.apply ?? "";
    const sourceJobId = posting.id ?? "";
    const locationRaw = posting.categories?.location ?? "";

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error("[webhook/lever] REDIS_URL is not configured.");
      return NextResponse.json({ error: "Redis not configured." }, { status: 500 });
    }

    let redis: Redis | null = null;
    try {
      redis = new Redis(redisUrl);
      await redis.xadd(
        "job-globe.discovery",
        "*",
        "source", "lever",
        "title", title,
        "description", description,
        "apply_url", applyUrl,
        "source_job_id", sourceJobId,
        "location_raw", locationRaw,
      );
    } catch (err) {
      console.error("[webhook/lever] Redis xadd failed:", err);
      return NextResponse.json({ error: "Failed to publish job to stream." }, { status: 500 });
    } finally {
      if (redis) {
        redis.disconnect();
      }
    }

    return NextResponse.json({ ok: true });
  }

  // 5. Other events — acknowledge
  console.log("[webhook/lever] Ignoring unhandled event:", event);
  return NextResponse.json({ ok: true, event: "ignored" });
}
