"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { driverEmailForPhone } from "@/lib/auth/driver-code";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export type DriverAuthResult = { ok: true } | { ok: false; error: string };

/**
 * Driver sign-in: phone + the code the owner issued.
 *
 * The phone is turned back into the synthetic address the account was created
 * under (see driver-code.ts), and the code is its password. After the session
 * exists we re-read the profile and refuse anyone who is not an active driver —
 * a suspended driver authenticates fine at the auth layer, since is_active lives
 * on the profile, so the door has to be shut here rather than left to the auth
 * result.
 */
export async function signInDriver(
  phoneInput: string,
  code: string
): Promise<DriverAuthResult> {
  const t = await getT();

  const phone = normalizeIraqiPhone(phoneInput);
  if (!phone) return { ok: false, error: t.auth.invalidPhone };
  if (!code.trim()) return { ok: false, error: t.driverAuth.invalidCode };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: driverEmailForPhone(phone),
    password: code.trim(),
  });

  // One message for a wrong phone and a wrong code alike: telling them apart
  // tells a stranger which phones are registered drivers.
  if (error) return { ok: false, error: t.driverAuth.invalidCode };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .maybeSingle();

  if (!profile || profile.role !== "driver") {
    await supabase.auth.signOut();
    return { ok: false, error: t.driverAuth.invalidCode };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return { ok: false, error: t.driverAuth.disabled };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Sign out from the driver app, back to the driver login screen. */
export async function signOutDriver() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
