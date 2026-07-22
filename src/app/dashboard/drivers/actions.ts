"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { driverEmailForPhone, generateDriverCode } from "@/lib/auth/driver-code";
import { getProfile } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { getSubscription } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";

const DRIVERS_PATH = "/dashboard/drivers";

export type RegisterResult =
  | { ok: true; code: string; phone: string }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * The caller must be staff of some restaurant. Returns that restaurant's id, or
 * null — every action here re-derives it from the session rather than trusting a
 * restaurant id from the form, so a staff member can only ever touch their own
 * drivers.
 */
async function staffRestaurantId(): Promise<string | null> {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role !== "owner" && profile.role !== "staff") return null;
  return profile.restaurant_id;
}

/**
 * Register a driver: create their Supabase account and profile, and hand the
 * owner a code to pass on.
 *
 * All of this runs with the service_role key because it has to — creating an
 * auth user and writing a `role='driver'` profile for someone else are both
 * beyond what the owner's own RLS grants (own_profile is their row only). The
 * ownership check above is therefore the whole security boundary, so it comes
 * first and the restaurant id is never taken from the client.
 */
export async function registerDriver(
  fullName: string,
  phoneInput: string
): Promise<RegisterResult> {
  const t = await getT();

  const restaurantId = await staffRestaurantId();
  if (!restaurantId) return { ok: false, error: t.drivers.notAllowed };

  // Driver dispatch is a pro feature. The page hides the form off the pro tier,
  // but this action is a POST endpoint like any other — a basic tenant must not
  // be able to add drivers by calling it directly.
  const plan = await getSubscription();
  if (!plan.canUsePro) return { ok: false, error: t.drivers.needsPro };

  const name = fullName.trim();
  if (name.length < 2) return { ok: false, error: t.drivers.nameTooShort };

  const phone = normalizeIraqiPhone(phoneInput);
  if (!phone) return { ok: false, error: t.auth.invalidPhone };

  const admin = createAdminClient();
  const email = driverEmailForPhone(phone);
  const code = generateDriverCode();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
    user_metadata: { role: "driver", driver_phone: phone },
  });

  if (createError || !created?.user) {
    // A duplicate email means this phone is already a driver somewhere. Kept
    // deliberately vague: the owner of restaurant B has no business learning
    // that a number drives for restaurant A.
    const alreadyExists =
      createError?.code === "email_exists" ||
      /already|exists|registered/i.test(createError?.message ?? "");
    return {
      ok: false,
      error: alreadyExists ? t.drivers.phoneTaken : t.drivers.createFailed,
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    restaurant_id: restaurantId,
    full_name: name,
    phone,
    role: "driver",
    driver_status: "offline",
    is_active: true,
  });

  if (profileError) {
    // Roll back the auth user, or a half-registered driver can log in to a
    // profile that does not exist and land nowhere.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: t.drivers.createFailed };
  }

  revalidatePath(DRIVERS_PATH);
  return { ok: true, code, phone };
}

/** Enable or disable a driver's login. Ownership re-checked, write via admin. */
export async function setDriverActive(
  driverId: string,
  active: boolean
): Promise<ActionResult> {
  const t = await getT();

  const restaurantId = await staffRestaurantId();
  if (!restaurantId) return { ok: false, error: t.drivers.notAllowed };

  const admin = createAdminClient();

  // Scope the update by BOTH id and restaurant_id and role: a driver id from
  // another tenant, or a non-driver profile, matches nothing and changes
  // nothing rather than erroring in a way that reveals it exists.
  const { data, error } = await admin
    .from("profiles")
    .update({ is_active: active })
    .eq("id", driverId)
    .eq("restaurant_id", restaurantId)
    .eq("role", "driver")
    .select("id");

  if (error || !data?.length) return { ok: false, error: t.drivers.updateFailed };

  revalidatePath(DRIVERS_PATH);
  return { ok: true };
}

/** Mint a fresh code, for a driver who lost theirs. Invalidates the old one. */
export async function regenerateDriverCode(
  driverId: string
): Promise<RegisterResult> {
  const t = await getT();

  const restaurantId = await staffRestaurantId();
  if (!restaurantId) return { ok: false, error: t.drivers.notAllowed };

  const admin = createAdminClient();

  // Confirm the driver is ours before touching their auth record.
  const { data: driver } = await admin
    .from("profiles")
    .select("id, phone")
    .eq("id", driverId)
    .eq("restaurant_id", restaurantId)
    .eq("role", "driver")
    .maybeSingle();

  if (!driver) return { ok: false, error: t.drivers.updateFailed };

  const code = generateDriverCode();
  const { error } = await admin.auth.admin.updateUserById(driverId, {
    password: code,
  });

  if (error) return { ok: false, error: t.drivers.updateFailed };

  revalidatePath(DRIVERS_PATH);
  return { ok: true, code, phone: driver.phone ?? "" };
}
