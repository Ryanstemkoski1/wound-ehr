// Supabase Service Role Client - Server Only
//
// SECURITY-CRITICAL: This client bypasses Row Level Security.
// Every call site MUST first verify the caller is authenticated
// AND authorized for the specific operation (e.g. tenant_admin or
// the user acting on their own row).
//
// Allowed use cases:
//   - Cross-tenant lookups (auth.users -> public.users) gated by
//     a prior auth.signInWithPassword() success.
//   - Admin user-management actions gated by requireTenantAdmin().
//   - acceptInvite() updating the invitee's own user row.
//
// NEVER use this client to:
//   - Read or write PHI tables (patients, wounds, visits, photos,
//     assessments, signatures, consents, transcripts).
//   - Perform any operation triggered directly by an unauthenticated
//     request (e.g. webhook bodies, public form posts).
//   - Replace a missing RLS policy. Fix the policy instead.
//
// NEVER expose this to the client! It is gated by `"use server"`
// imports and the absence of a leading PUBLIC_ prefix on the env var.

import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase service config. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables."
    );
  }

  // Defense in depth: if this module is ever bundled into a browser
  // context (it should not be — the file lives outside the client
  // import graph), throw before instantiating.
  if (typeof window !== "undefined") {
    throw new Error(
      "createServiceClient() called in a browser context. This is a security bug."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
