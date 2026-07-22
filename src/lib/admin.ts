import "server-only";

import { getProfile } from "@/lib/auth/user";

/**
 * Confirms the caller is a platform admin, returning their id.
 *
 * This is the whole authorization for the admin panel. Every admin read and
 * write is cross-tenant and runs with the service_role key, which bypasses RLS —
 * so nothing at the database level stops those queries touching another
 * restaurant. What stops a non-admin is this check, at the top of every admin
 * action and on the admin layout, reading the role from the verified session
 * (getProfile → getUser, which revalidates the token rather than trusting the
 * cookie). Returns null for anyone who is not an admin; callers refuse on null.
 */
export async function requireAdmin(): Promise<string | null> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return null;
  return profile.id;
}
