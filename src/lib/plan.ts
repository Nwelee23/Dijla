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
 * The single pro-tier gate. Delivery and driver dispatch are the pro features;
 * this decides both, so the rule lives in exactly one place.
 *
 * A trial counts. The whole point of thirty free days is that the owner gets to
 * judge the thing they are being asked to pay for, and delivery is that thing.
 * A missing subscription row reads as a live trial, matching `getSubscription`:
 * 0009 backfills every restaurant, so an absent row means our bookkeeping broke,
 * and switching off a pilot restaurant over our own error is the worse way to be
 * wrong.
 *
 * cancelled is the one status that overrides the tier. A pro subscription that
 * has been cancelled is not pro any more — checking the tier first, as an
 * earlier version did, left a cancelled restaurant with delivery still on.
 * past_due is deliberately NOT cut off: it is the grace state between a missed
 * payment and cancellation, and the app keeps working while it is sorted out.
 */
export function canUsePro(plan: PlanInput): boolean {
  const status = plan.status ?? "trial";
  if (status === "cancelled") return false;
  if (plan.tier === "pro") return true;
  // basic tier: only a live trial unlocks the pro features.
  return status === "trial" && plan.daysLeft >= 0;
}

/** Delivery is a pro feature — the order route reads this by its own name. */
export const canTakeDelivery = canUsePro;

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

/**
 * Why a pro feature is unavailable, for a dashboard that has to explain itself.
 * `trial_ended` when a trial ran out; `needs_pro` for a basic or cancelled
 * tenant who never had it or let it go.
 */
export function proLockReason(
  plan: PlanInput
): "trial_ended" | "needs_pro" | null {
  if (canUsePro(plan)) return null;
  return (plan.status ?? "trial") === "trial" ? "trial_ended" : "needs_pro";
}

/** Named for the delivery call sites; the same reason applies to all pro gates. */
export const deliveryLockReason = proLockReason;
