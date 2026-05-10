/**
 * Supabase SSR auth helpers for Next.js App Router route handlers.
 *
 * Pattern:
 *   1. createSSRSupabaseClient(request) — creates an anon-key client that
 *      reads the user's session from request cookies.
 *   2. getAuthUser(request)             — returns the Supabase Auth user or null.
 *   3. resolveInternalUser(authUserId)  — looks up / creates the users table row
 *      (keyed by auth_subject = Supabase Auth user UUID).
 *
 * We keep the service-role client (server.ts) for admin DB operations and only
 * use the anon-key client to validate the user's JWT.
 */

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

import { createServerSupabaseClient } from "./server";

// ── SSR client (anon key + cookie session) ─────────────────────────────────

/**
 * Create a Supabase client that validates the user's JWT from cookies.
 * Uses the public anon key — safe to call in every route handler.
 */
export function createSSRSupabaseClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      // No-op: route handlers don't set cookies on responses here.
      // Auth state is managed by Supabase client-side SDK.
      setAll() {},
    },
  });
}

// ── Auth user resolution ───────────────────────────────────────────────────

export interface AuthUser {
  /** Supabase Auth user UUID (also stored as users.auth_subject) */
  authId: string;
  email: string | null;
}

/**
 * Extract the authenticated user from the request's session cookie.
 * Returns null if unauthenticated or Supabase is not configured.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const client = createSSRSupabaseClient(request);
  if (!client) return null;

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) return null;

    return {
      authId: user.id,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}

// ── Internal user resolver ─────────────────────────────────────────────────

export interface InternalUser {
  /** Internal users table UUID — used as FK in profiles, saved_jobs, etc. */
  id: string;
  authId: string;
  email: string | null;
}

/**
 * Given a Supabase Auth user ID, look up or create the corresponding row in
 * the users table (keyed by auth_subject).
 *
 * Uses the service-role client so it can always write regardless of RLS.
 */
export async function resolveInternalUser(
  authUser: AuthUser,
): Promise<InternalUser | null> {
  try {
    const supabase = createServerSupabaseClient();

    // Try to find the existing user
    const { data: existing } = await supabase
      .from("users")
      .select("id, auth_subject, email")
      .eq("auth_subject", authUser.authId)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, authId: authUser.authId, email: existing.email };
    }

    // First login — provision the users row
    const { data: created, error } = await supabase
      .from("users")
      .insert({
        auth_provider: "supabase",
        auth_subject: authUser.authId,
        email: authUser.email,
        role: "member",
      })
      .select("id")
      .single();

    if (error || !created) return null;

    return { id: created.id, authId: authUser.authId, email: authUser.email };
  } catch {
    return null;
  }
}

/**
 * Convenience: resolve the full internal user from a request in one call.
 * Returns null if unauthenticated, Supabase unconfigured, or provisioning failed.
 */
export async function resolveRequestUser(
  request: NextRequest,
): Promise<InternalUser | null> {
  const authUser = await getAuthUser(request);
  if (!authUser) return null;
  return resolveInternalUser(authUser);
}
