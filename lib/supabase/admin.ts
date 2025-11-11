// Supabase Admin Client - For admin operations only
// Uses service role key with elevated privileges
// WARNING: Only use in Server Actions/Components - NEVER expose to client

import { createClient } from "@supabase/supabase-js";

/**
 * Create Supabase admin client with service role key
 * This client bypasses RLS and has full database access
 * Use ONLY for admin operations like deleting users
 */
export function createAdminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
