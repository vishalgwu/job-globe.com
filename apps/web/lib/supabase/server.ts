import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfigStatus {
  configured: boolean;
  missing: string[];
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (key) => !process.env[key],
  );

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
