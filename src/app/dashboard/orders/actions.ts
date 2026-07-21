"use server";

import { revalidatePath } from "next/cache";

import { getT } from "@/lib/i18n/server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
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
