export type AuthConfig = { provider: "supabase"; sessionCookieName: string; ttlSeconds: number };

export function getAuthConfig(): AuthConfig {
  return {
    provider: "supabase",
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "job_globe_session",
    ttlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 3600)
  };
}
