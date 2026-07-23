/**
 * Subscription pricing and the delivery-app commission the landing page's
 * savings calculator compares against (REMAINING_SCREENS_SPEC §B.2, §B.3).
 *
 * Kept in a config file on purpose: these numbers change during the pilot, and
 * they must be adjustable without touching UI or redeploying logic. Amounts are
 * whole IQD per month.
 */
export const PRICING = {
  currency: "IQD",
  basic: { monthly: 25_000 },
  pro: { monthly: 45_000 },
  /** The commission a typical delivery app takes — what the subscription replaces. */
  commissionRate: 0.25,
} as const;

/** Feature keys per tier, resolved to copy in the dictionary. */
export const TIER_FEATURES = {
  basic: ["qrMenu", "liveOrders", "reports", "onePrice"],
  pro: ["everythingBasic", "delivery", "drivers", "prioritySupport"],
} as const;
