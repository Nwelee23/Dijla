"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getT } from "@/lib/i18n/server";
import { allowRequest } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { MIN_PASSWORD_LENGTH } from "./password";
import { normalizeIraqiPhone } from "./phone";
import { isValidUsername, normalizeUsername } from "./username";

export type AuthResult = { ok: true } | { ok: false; error: string };

export type UsernameCheck = {
  status: "available" | "taken" | "invalid" | "rate_limited";
};

/**
 * Live username availability for the signup field (AUTH_UI_SPEC §5).
 *
 * Uses the service-role client: during signup the caller has no profile yet, so
 * RLS would hide every other row and every name would look "available". A
 * malformed handle returns "invalid" (so the field can say why, distinct from
 * "taken"), and a malformed one never reaches the DB. Case-insensitive, matching
 * the DB's unique index on lower().
 *
 * Runs unauthenticated and reads via service_role, so it is throttled per IP —
 * usernames are not secret, but bulk probing should not be free. The limiter is
 * best-effort (see rate-limit.ts); it caps abuse without blocking a real
 * signer-up, who makes only a handful of debounced checks.
 */
export async function checkUsernameAvailable(
  username: string
): Promise<UsernameCheck> {
  const u = normalizeUsername(username);
  if (!isValidUsername(u)) return { status: "invalid" };

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowRequest(`username-check:${ip}`, 30, 60_000)) {
    return { status: "rate_limited" };
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", u)
    .maybeSingle();

  return { status: data ? "taken" : "available" };
}

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
 * Emailed-code sign-in (AUTH_UI_SPEC §3.2, email-adapted): verify the code and
 * route by role in one step, so the glass screen redirects like the password
 * login. Shares homeForRole with signInWithUsername. The email is the anchor
 * while there is no SMS provider, so this doubles as the interim recovery path —
 * getting in by code lets the owner reset the password from settings.
 */
export async function verifyLoginCode(
  email: string,
  token: string
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const t = await getT();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });
  if (error || !data.user) return { ok: false, error: t.auth.invalidCode };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: homeForRole(profile?.role) };
}

/**
 * Forgot-password step 1: send the recovery code (AUTH_UI_SPEC §3.3).
 *
 * ALWAYS reports success (for a well-formed email) so the screen reveals nothing
 * about whether an account exists — §7's neutrality rule. A real account gets a
 * code; a stranger's guess silently gets nothing. Only a malformed address —
 * which says nothing about account existence — returns an error.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const t = await getT();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return { ok: false, error: t.auth.invalidEmail };
  }

  const supabase = await createClient();
  // shouldCreateUser:false — a reset must never conjure a new account, and the
  // "user not found" error is swallowed below to stay neutral.
  await supabase.auth.signInWithOtp({
    email: normalized,
    options: { shouldCreateUser: false },
  });

  return { ok: true };
}

/**
 * Forgot-password step 2: verify the code and set a new password
 * (AUTH_UI_SPEC §3.3, §7). Verifying the emailed code establishes a session;
 * we set the password, then sign out every OTHER session so a leaked old
 * password (or an attacker's live session) is cut off. The current session
 * stays, so the owner lands signed in and is routed by role.
 */
export async function resetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const t = await getT();
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: t.auth.passwordTooShort };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email",
  });
  if (error || !data.user) return { ok: false, error: t.auth.invalidCode };

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) return { ok: false, error: updateError.message };

  // Invalidate every other session; keep this one so the reset flows straight in.
  await supabase.auth.signOut({ scope: "others" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: homeForRole(profile?.role) };
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
