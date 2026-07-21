"use server";

import { revalidatePath } from "next/cache";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { driverEmailForPhone } from "@/lib/auth/driver-code";
import { getUser } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DriverAuthResult = { ok: true } | { ok: false; error: string };
export type DriverActionResult = { ok: true } | { ok: false; error: string };

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

/**
 * Fetch an order only if the signed-in driver is the one assigned to it.
 *
 * This is the gate for every driver write. 0011 dropped the driver's UPDATE
 * policy on orders precisely because RLS cannot restrict *which columns* a
 * driver may change — so the writes below run with service_role, and this check
 * is the whole authorization. auth.uid() comes from getUser(), which verifies
 * the token with Supabase rather than trusting the cookie.
 */
async function assignedOrder(orderId: string) {
  const user = await getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("id, status, driver_id, total")
    .eq("id", orderId)
    .maybeSingle();

  if (!data || data.driver_id !== user.id) return null;
  // driver_id equals user.id here, so hand back a non-null string for the writes.
  return { admin, order: data, driverId: user.id };
}

/**
 * The driver's own availability. Their row, their choice — done through their
 * own session, which own_profile already permits, so no service_role here.
 *
 * `busy` is not offered: it is set automatically for the length of a run (see
 * markPickedUp / completeDelivery), not toggled by hand. The manual choice is
 * only "I am working" or "I am done for now".
 */
export async function setAvailability(
  status: "available" | "offline"
): Promise<DriverActionResult> {
  const t = await getT();
  if (status !== "available" && status !== "offline") {
    return { ok: false, error: t.driverApp.actionFailed };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: t.driverApp.actionFailed };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ driver_status: status })
    .eq("id", user.id);

  if (error) return { ok: false, error: t.driverApp.actionFailed };

  revalidatePath("/driver");
  return { ok: true };
}

/**
 * Driver collects the food: ready -> out_for_delivery.
 *
 * The status is checked, not just the ownership: replaying this on an order that
 * has already moved on must not drag it backwards. The status-history row is
 * written by the 0007 trigger on the update, so it is recorded no matter that
 * this path uses service_role.
 */
export async function markPickedUp(orderId: string): Promise<DriverActionResult> {
  const t = await getT();
  const found = await assignedOrder(orderId);
  if (!found) return { ok: false, error: t.driverApp.actionFailed };
  if (found.order.status !== "ready") {
    return { ok: false, error: t.driverApp.actionFailed };
  }

  const { error } = await found.admin
    .from("orders")
    .update({ status: "out_for_delivery" })
    .eq("id", orderId);

  if (error) return { ok: false, error: t.driverApp.actionFailed };

  // On the road now: mark the driver busy so dispatch stops handing them runs.
  // service_role, so the self-update guard (0012) does not apply.
  await found.admin
    .from("profiles")
    .update({ driver_status: "busy" })
    .eq("id", found.driverId);

  revalidatePath("/driver");
  return { ok: true };
}

/**
 * Driver hands over the food and takes the cash, in one step because that is one
 * moment: out_for_delivery -> delivered, recording what was actually collected
 * and marking it paid. COD leaves no room for a delivered-but-unpaid limbo.
 *
 * Only the three fields a delivery closes with are written — the whitelist the
 * ground rule asks for lives here, in what the action chooses to set, since the
 * service_role client could set anything.
 */
export async function completeDelivery(
  orderId: string,
  cashCollected: number
): Promise<DriverActionResult> {
  const t = await getT();
  const found = await assignedOrder(orderId);
  if (!found) return { ok: false, error: t.driverApp.actionFailed };
  if (found.order.status !== "out_for_delivery") {
    return { ok: false, error: t.driverApp.actionFailed };
  }

  // Bounded to the bill: a driver cannot record collecting more than was owed,
  // and a negative is a typo, not a refund.
  const total = Number(found.order.total);
  if (!Number.isFinite(cashCollected) || cashCollected < 0 || cashCollected > total) {
    return { ok: false, error: t.driverApp.invalidCash };
  }

  const { error } = await found.admin
    .from("orders")
    .update({
      status: "delivered",
      cash_collected: cashCollected,
      payment_status: "paid",
    })
    .eq("id", orderId);

  if (error) return { ok: false, error: t.driverApp.actionFailed };

  // Free again once nothing else is in hand. Only flip a driver who is `busy`
  // back to available — one who has stepped offline stays offline, and their
  // other live runs (if any) keep them busy.
  const { data: remaining } = await found.admin
    .from("orders")
    .select("id")
    .eq("driver_id", found.driverId)
    .in("status", ["ready", "out_for_delivery"])
    .limit(1);

  if (!remaining?.length) {
    await found.admin
      .from("profiles")
      .update({ driver_status: "available" })
      .eq("id", found.driverId)
      .eq("driver_status", "busy");
  }

  revalidatePath("/driver");
  return { ok: true };
}
