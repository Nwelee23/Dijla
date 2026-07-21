import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { supabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Supabase client with the **service_role** key — bypasses RLS entirely.
 *
 * The `server-only` import above makes the build fail if this file is ever pulled
 * into a Client Component, so the key cannot leak into the browser bundle.
 *
 * Use it ONLY where there is no authenticated user and the server must act on their
 * behalf (e.g. anonymous dine-in order creation in Phase 2). Every input must be
 * validated server-side first — this client trusts nothing on its own.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "Missing environment variable SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in."
    );
  }

  return createSupabaseClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
