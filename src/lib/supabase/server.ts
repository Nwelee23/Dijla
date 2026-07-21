import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the anon key and the caller's session cookies, so **RLS still applies** —
 * this is the client to reach for by default. For the rare anonymous-write path
 * (e.g. a diner placing an order) use the service_role client in `admin.ts`.
 *
 * Must be awaited per request; never cache the returned client across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: middleware refreshes the session (task 0.5).
        }
      },
    },
  });
}
