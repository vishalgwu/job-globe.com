/**
 * POST /api/auth/refresh
 *
 * Attempts to refresh the Supabase session using the cookie-based refresh
 * token.  Called by the browser client before token expiry.
 *
 * Supabase SSR handles cookie refresh transparently in most cases, but this
 * endpoint allows explicit refresh from client-side logic when needed.
 */

import { type NextRequest, NextResponse } from "next/server";

import { createSSRSupabaseClient } from "../../../../lib/supabase/auth";

export async function POST(request: NextRequest) {
  const client = createSSRSupabaseClient(request);

  if (!client) {
    return NextResponse.json(
      { refreshed: false, error: "Supabase not configured." },
      { status: 503 },
    );
  }

  try {
    const { data, error } = await client.auth.refreshSession();

    if (error || !data.session) {
      return NextResponse.json({ refreshed: false, error: error?.message ?? "No session." });
    }

    return NextResponse.json({ refreshed: true, expiresAt: data.session.expires_at });
  } catch (err) {
    console.error("auth/refresh error", err);
    return NextResponse.json({ refreshed: false, error: "Refresh failed." }, { status: 500 });
  }
}
