"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminResult = { ok: true } | { ok: false; error: string };

const TIERS = ["basic", "pro"] as const;
const STATUSES = ["trial", "active", "past_due", "cancelled"] as const;

/** Suspend or reactivate a whole restaurant. */
export async function setRestaurantActive(
  restaurantId: string,
  active: boolean
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({ is_active: active })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}

const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;

/**
 * Verify or reject a restaurant (AUTH_UI_SPEC §6). The service-role client is
 * the trusted path the guard trigger (0022) allows to set these fields — an
 * owner cannot self-verify. A rejection carries a reason the owner then sees;
 * verifying stamps verified_at and clears any stale note.
 */
export async function setVerification(
  restaurantId: string,
  status: "verified" | "rejected" | "pending",
  note: string | null
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };
  if (!VERIFICATION_STATUSES.includes(status)) {
    return { ok: false, error: t.admin.updateFailed };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({
      verification_status: status,
      verified_at: status === "verified" ? new Date().toISOString() : null,
      verification_note: status === "rejected" ? note?.trim() || null : null,
    })
    .eq("id", restaurantId);

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Set a restaurant's subscription: tier, status and the trial/period dates.
 *
 * Activation is manual for now — no payment gateway — so this is where "who
 * paid" is recorded. Upserts on restaurant_id (unique per 0009), so a
 * restaurant that somehow has no row still gets one rather than silently
 * failing.
 */
export async function setSubscription(
  restaurantId: string,
  input: {
    tier: string;
    status: string;
    amount: number | null;
    startDate: string | null;
    endDate: string | null;
    cancellationReason: string | null;
  }
): Promise<AdminResult> {
  const t = await getT();
  if (!(await requireAdmin())) return { ok: false, error: t.admin.notAllowed };

  if (!TIERS.includes(input.tier as (typeof TIERS)[number])) {
    return { ok: false, error: t.admin.updateFailed };
  }
  if (!STATUSES.includes(input.status as (typeof STATUSES)[number])) {
    return { ok: false, error: t.admin.updateFailed };
  }
  // The monthly price feeds MRR; a negative is a typo, not a credit.
  if (input.amount !== null && (!Number.isFinite(input.amount) || input.amount < 0)) {
    return { ok: false, error: t.admin.updateFailed };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").upsert(
    {
      restaurant_id: restaurantId,
      tier: input.tier,
      status: input.status,
      amount: input.amount,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      // Only meaningful on a cancellation; cleared otherwise so a reason from a
      // past churn does not linger on a resubscribed restaurant.
      cancellation_reason:
        input.status === "cancelled" ? input.cancellationReason || null : null,
    },
    { onConflict: "restaurant_id" }
  );

  if (error) return { ok: false, error: t.admin.updateFailed };

  revalidatePath("/admin");
  return { ok: true };
}
