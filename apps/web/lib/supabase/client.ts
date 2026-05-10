/**
 * Browser-side Supabase client.
 *
 * Use in "use client" components for auth operations (sign-in, sign-up,
 * sign-out, session refresh).  The anon key is safe to expose to the browser.
 *
 * Server-side operations (route handlers, server components) must use
 * createServerSupabaseClient() from ./server instead.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  return createBrowserClient(url, anonKey);
}
