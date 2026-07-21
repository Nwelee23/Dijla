import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Profile = Tables<"profiles">;

/**
 * The signed-in user, or null.
 *
 * Always `getUser()`, never `getSession()`, on the server: getSession reads the
 * cookie without verifying it, so a forged cookie would look like a valid login.
 * getUser revalidates the token with Supabase.
 *
 * Wrapped in React `cache` so several components in one render share a single call.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/** The signed-in user's profile row, or null if they have not onboarded yet. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
});

/**
 * For pages that must not render without a user. Middleware already redirects
 * unauthenticated traffic; this is the second line of defence for direct
 * navigation, and it narrows the type for callers.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");

  return user;
}
