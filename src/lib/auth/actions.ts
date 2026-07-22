"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { normalizeIraqiPhone } from "./phone";

export type AuthResult = { ok: true } | { ok: false; error: string };

/** After login the role decides home (AUTH_UI_SPEC §2). */
function homeForRole(role: string | null | undefined): string {
  if (role === "driver") return "/driver";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

/**
 * Daily sign-in: username + password (AUTH_UI_SPEC §3.1).
 *
 * Supabase password auth is keyed by email, not username, so the username is
 * resolved to its account email **server-side only** — the email is never
 * returned to the browser, which keeps it out of the product per the spec's
 * "no email anywhere" rule while still using it as the identifier underneath.
 * An identifier containing "@" is taken as the email directly, so the existing
 * email-based accounts (and staff who only know their email) are never locked
 * out while usernames roll in.
 *
 * Errors are deliberately one neutral message: a wrong username and a wrong
 * password must be indistinguishable so the form cannot be used to test which
 * usernames exist.
 */
export async function signInWithUsername(
  identifier: string,
  password: string
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const t = await getT();
  const id = identifier.trim().toLowerCase();
  if (!id || !password) return { ok: false, error: t.auth.loginFailed };

  let email: string | null = null;
  if (id.includes("@")) {
    email = id;
  } else {
    // Look the username up with the service-role client: profiles is readable
    // under RLS only for your own row, and here there is no session yet.
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", id)
      .maybeSingle();
    if (profile) {
      const { data } = await admin.auth.admin.getUserById(profile.id);
      email = data.user?.email ?? null;
    }
  }

  if (!email) return { ok: false, error: t.auth.loginFailed };

  const supabase = await createClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !signIn.user) return { ok: false, error: t.auth.loginFailed };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signIn.user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: homeForRole(profile?.role) };
}

/**
 * Step 1 of email sign-in: send the code. This is the primary flow — delivery
 * runs through Brevo SMTP configured in the Supabase dashboard.
 *
 * `shouldCreateUser` decides login vs. signup: on the login screen we do not
 * want a typo to silently create a new account.
 */
export async function sendEmailOtp(
  email: string,
  { allowSignUp = false }: { allowSignUp?: boolean } = {}
): Promise<AuthResult> {
  const t = await getT();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return { ok: false, error: t.auth.invalidEmail };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: allowSignUp },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Step 2 of email sign-in: exchange the emailed code for a session. */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Step 1 of phone sign-in: send the SMS code.
 *
 * Kept for later — phone OTP needs a paid SMS provider (Authentication ->
 * Providers -> Phone). Email OTP above is the primary flow today.
 */
export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  const t = await getT();
  const normalized = normalizeIraqiPhone(phone);
  if (!normalized) {
    return { ok: false, error: t.auth.invalidPhone };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: normalized });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Step 2 of phone sign-in: exchange the SMS code for a session. */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<AuthResult> {
  const t = await getT();
  const normalized = normalizeIraqiPhone(phone);
  if (!normalized) {
    return { ok: false, error: t.auth.invalidPhone };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: "sms",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Email + password sign-in — the fallback, and what we test with today. */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
