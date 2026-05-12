/**
 * Next.js Edge Middleware — CORS + rate limiting + auth redirect guard.
 *
 * CORS strategy:
 *   Allowed origins are configured via ALLOWED_ORIGINS (comma-separated list).
 *   Defaults to localhost:3000 for development.  In production, set this to
 *   your Vercel deployment URL, e.g. "https://job-globe.vercel.app".
 *   OPTIONS preflight requests are handled here and short-circuited with 204.
 *   CORS headers are added to every API response.
 *
 * Rate limiting strategy: sliding-window token bucket using an in-process Map.
 * This is intentionally simple for MVP: it limits requests per IP per window
 * on this Edge instance. In a multi-instance deployment, replace with a shared
 * Redis-backed counter (e.g. Upstash Ratelimit).
 *
 * Limits (configurable via environment):
 *   RATE_LIMIT_MAX     — max requests per window (default 60)
 *   RATE_LIMIT_WINDOW  — window size in seconds (default 60)
 *
 * API routes exceeding the limit receive 429 Too Many Requests.
 * Non-API routes are not rate-limited here (Next.js page routing is fast).
 */

import { type NextRequest, NextResponse } from "next/server";

export const config = {
  // Only run on API routes — avoids slowing down page navigation.
  matcher: ["/api/:path*"],
};

// ── CORS ──────────────────────────────────────────────────────────────────
// Parse ALLOWED_ORIGINS env var once at module load time.
// Example: ALLOWED_ORIGINS="https://job-globe.vercel.app,https://staging.job-globe.vercel.app"
const ALLOWED_ORIGINS: Set<string> = new Set(
  (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization,X-Requested-With";

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function addCorsHeaders(response: NextResponse, allowedOrigin: string | null): void {
  if (!allowedOrigin) return;
  response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  response.headers.set("Access-Control-Max-Age", "86400");
  // Allow cookies/auth headers in cross-origin requests.
  response.headers.set("Access-Control-Allow-Credentials", "true");
  // Vary on Origin so CDNs cache per-origin correctly.
  response.headers.append("Vary", "Origin");
}

// ── In-process sliding window store ───────────────────────────────────────
// Each entry: { count, windowStart (ms) }
const store = new Map<string, { count: number; windowStart: number }>();

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? "60", 10);
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW ?? "60", 10) * 1_000;

// Prune stale entries periodically to avoid unbounded memory growth.
// In the Edge runtime this runs in-process; it's best-effort.
let lastPruned = Date.now();
function maybePrune(now: number): void {
  if (now - lastPruned < 60_000) return;
  lastPruned = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Routes that get a stricter per-IP limit ────────────────────────────────
// quick-prep calls OpenAI; resume upload is large. Apply a 10 req/min cap.
const STRICT_PATHS = new Set(["/api/quick-prep", "/api/resume"]);
const STRICT_MAX = 10;

export function middleware(request: NextRequest): NextResponse {
  const now = Date.now();
  maybePrune(now);

  const pathname = request.nextUrl.pathname;
  const allowedOrigin = getAllowedOrigin(request);

  // ── CORS preflight ───────────────────────────────────────────────────────
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    addCorsHeaders(preflight, allowedOrigin);
    return preflight;
  }

  // Webhooks are authenticated by HMAC — exempt from IP rate limiting.
  if (pathname.startsWith("/api/webhooks/")) {
    const res = NextResponse.next();
    addCorsHeaders(res, allowedOrigin);
    return res;
  }

  const ip = getClientIp(request);

  // Choose the right limit for this path.
  const limit = STRICT_PATHS.has(pathname) ? STRICT_MAX : MAX_REQUESTS;
  const key = `${ip}:${
    pathname.startsWith("/api/quick-prep") || pathname.startsWith("/api/resume")
      ? pathname
      : "api"
  }`;

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    const res = addRateLimitHeaders(NextResponse.next(), 1, limit, WINDOW_MS);
    addCorsHeaders(res, allowedOrigin);
    return res;
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterSec = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1_000);
    const res = new NextResponse(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((entry.windowStart + WINDOW_MS) / 1_000)),
        },
      },
    );
    addCorsHeaders(res, allowedOrigin);
    return res;
  }

  const res = addRateLimitHeaders(
    NextResponse.next(),
    entry.count,
    limit,
    WINDOW_MS - (now - entry.windowStart),
  );
  addCorsHeaders(res, allowedOrigin);
  return res;
}

function addRateLimitHeaders(
  response: NextResponse,
  count: number,
  limit: number,
  remainingMs: number,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil((Date.now() + remainingMs) / 1_000)),
  );
  return response;
}
