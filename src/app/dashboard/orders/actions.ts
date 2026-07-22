"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { getSubscription } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Moves an order along.
 *
 * The status history row is written by a trigger (0007), not here — every
 * transition gets recorded no matter which code path caused it.
 */
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  const t = await getT();

  // The column has a CHECK constraint; rejecting here gives a readable error
  // instead of a raw constraint violation on the kitchen screen.
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: t.orders.updateFailed };
  }

  const supabase = await createClient();
  // RLS scopes this to the signed-in restaurant, so a forged id matches no row.
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/orders");
  return { ok: true };
}

/**
 * Assign a delivery order to one of the restaurant's own drivers, reassign it,
 * or (with driverId null) take it back.
 *
 * The validation that matters is that the driver is ours. RLS lets staff update
 * any column of their own orders, including driver_id, so nothing at the row
 * level stops an owner pointing driver_id at a stranger's account — and doing so
 * would hand that stranger read access to this order through the driver policy.
 * So the target is checked here: it must be an active driver profile belonging
 * to this restaurant, read through the caller's own RLS (which only exposes this
 * restaurant's profiles) so an id from another tenant simply is not found.
 */
export async function assignDriver(
  orderId: string,
  driverId: string | null
): Promise<ActionResult> {
  const t = await getT();
  const supabase = await createClient();

  // Dispatch is a pro feature. Unassigning (driverId null) is always allowed —
  // a tenant who downgrades must be able to take a run back — but handing an
  // order to a driver is gated, server-side, not only in the card.
  if (driverId) {
    const plan = await getSubscription();
    if (!plan.canUsePro) return { ok: false, error: t.orders.assignFailed };
  }

  if (driverId) {
    const { data: driver } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", driverId)
      .eq("role", "driver")
      .eq("is_active", true)
      .maybeSingle();

    if (!driver) return { ok: false, error: t.orders.assignFailed };
  }

  // Only delivery orders carry a driver. Scoped to type as well, so a dine-in
  // or pickup id cannot be given one by crafting a request.
  const { data, error } = await supabase
    .from("orders")
    .update({ driver_id: driverId })
    .eq("id", orderId)
    .eq("type", "delivery")
    .select("id");

  if (error || !data?.length) return { ok: false, error: t.orders.assignFailed };

  revalidatePath("/dashboard/orders");
  return { ok: true };
}
