"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

import { normalizeIraqiPhone } from "./phone";

export type AuthResult = { ok: true } | { ok: false; error: string };

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
