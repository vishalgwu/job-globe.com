/** @type {import("next").NextConfig} */

// ── Content Security Policy ────────────────────────────────────────────────
// Tighten incrementally: start permissive on scripts/styles so Next.js hot
// reload and Supabase Auth redirects work, then narrow in production.
const CSP = [
  "default-src 'self'",
  // Next.js needs 'unsafe-inline' for styles and 'unsafe-eval' in dev only.
  // In production, Next.js inlines critical CSS; external fonts come from none.
  "style-src 'self' 'unsafe-inline'",
  // Scripts: 'self' + 'unsafe-inline' needed by Next.js App Router chunks.
  // Remove 'unsafe-eval' in prod; keep for dev HMR.
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  // Supabase project URL for API calls and auth flows.
  `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} https://*.supabase.co wss://*.supabase.co`,
  // Images: Supabase Storage (signed URLs) + data URIs.
  "img-src 'self' data: blob: https://*.supabase.co",
  // Frames: disallow embedding in iframes.
  "frame-ancestors 'none'",
  // No plugins (Flash, etc.).
  "object-src 'none'",
  // Upgrade insecure requests in production.
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Stop clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // XSS filter (legacy browsers).
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // No referrer information to third-party origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict permission APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS: production only — avoids localhost breakage in dev.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Required for Docker/Railway standalone deployment
  output: "standalone",

  // ── Security headers on every response ──────────────────────────────────
  async headers() {
    return [
      {
        // Apply to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
