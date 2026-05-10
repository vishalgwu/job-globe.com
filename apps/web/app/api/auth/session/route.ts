/**
 * GET /api/auth/session
 *
 * Returns the current authentication state for the requesting user.
 * Called by client components on mount to initialise the user store.
 *
 * Response shape (unauthenticated):
 *   { authenticated: false }
 *
 * Response shape (authenticated):
 *   {
 *     authenticated: true,
 *     userId: string,          // internal users.id UUID
 *     email: string | null,
 *     hasProfile: boolean,     // true if a profiles row exists
 *   }
 */

import { type NextRequest, NextResponse } from "next/server";

import { resolveRequestUser } from "../../../../lib/supabase/auth";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  // Check whether this user has completed onboarding
  let hasProfile = false;
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    hasProfile = Boolean(data);
  } catch {
    // Non-fatal — return auth state without profile flag
  }

  return NextResponse.json({
    authenticated: true,
    userId: user.id,
    email: user.email,
    hasProfile,
  });
}
