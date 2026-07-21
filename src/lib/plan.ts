/**
 * What a restaurant's subscription entitles it to.
 *
 * Delivery is the upsell — it is the feature that replaces Talabat, so it is
 * the one worth paying for. Pickup is not gated: it needs no driver and costs
 * the restaurant nothing to offer, and putting it behind the same wall would
 * only make the free tier look punitive rather than limited.
 *
 * Pure, and importable from anywhere. The two callers that matter read the
 * subscription very differently — the dashboard through the owner's own session
 * under RLS, the public order route through the admin client for a restaurant
 * nobody is signed in to — so the rule lives here rather than in either of them.
 */

export type Tier = "basic" | "pro";

export type PlanInput = {
  tier: string | null | undefined;
  status: string | null | undefined;
  /** Whole days until the subscription ends. Negative once it has passed. */
  daysLeft: number;
};

/**
 * A trial counts. The whole point of thirty free days is that the owner gets to
 * judge the thing they are being asked to pay for, and delivery is that thing.
 *
 * A missing subscription row reads as a live trial, matching `getSubscription`:
 * 0009 backfills every restaurant, so an absent row means our bookkeeping broke,
 * and switching off a pilot restaurant's delivery over our own error is the
 * worse way to be wrong.
 */
export function canTakeDelivery(plan: PlanInput): boolean {
  if (plan.tier === "pro") return true;
  const status = plan.status ?? "trial";
  return status === "trial" && plan.daysLeft >= 0;
}

/**
 * Whole days until a subscription ends, counted to the end of that day.
 *
 * A trial ending "today" is on its last day, not expired because it is now the
 * afternoon. Floor rather than ceil, or a fresh 30-day trial greets the owner
 * with "31 days left".
 */
export function daysUntilEnd(endDate: string | null | undefined): number {
  if (!endDate) return 0;
  return Math.floor(
    (new Date(`${endDate}T23:59:59`).getTime() - Date.now()) / 86_400_000
  );
}

/** A subscription row, from either side of the RLS boundary. */
export function planFromRow(
  row: { tier?: string | null; status?: string | null; end_date?: string | null } | null
): PlanInput {
  return {
    tier: row?.tier,
    status: row?.status,
    daysLeft: daysUntilEnd(row?.end_date),
  };
}

/** Why delivery is unavailable, for a dashboard that has to explain itself. */
export function deliveryLockReason(
  plan: PlanInput
): "trial_ended" | "needs_pro" | null {
  if (canTakeDelivery(plan)) return null;
  return (plan.status ?? "trial") === "trial" ? "trial_ended" : "needs_pro";
}
