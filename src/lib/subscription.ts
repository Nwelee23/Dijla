import "server-only";

import { cache } from "react";

import { canUsePro, daysUntilEnd, proLockReason } from "@/lib/plan";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Subscription = Tables<"subscriptions">;

export type SubscriptionState = {
  subscription: Subscription | null;
  /** Whole days remaining. Negative once the end date has passed. */
  daysLeft: number;
  isTrial: boolean;
  /** Paid and current — nothing to nag about. */
  isActive: boolean;
  /** Trial is over and nobody has marked them paid. */
  isExpired: boolean;
  /** Worth warning the owner about, but still working. */
  isEndingSoon: boolean;
  /** Payment lapsed but not yet cancelled — a grace state, features stay on. */
  isPastDue: boolean;
  /** The pro tier is available: delivery and driver dispatch. See `lib/plan.ts`. */
  canUsePro: boolean;
  /** Null when unlocked, else why it is locked. */
  proLock: ReturnType<typeof proLockReason>;
};

/** When the countdown starts being shown as a warning rather than a note. */
const WARN_WITHIN_DAYS = 7;

export const getSubscription = cache(async (): Promise<SubscriptionState> => {
  const supabase = await createClient();
  // RLS scopes this to the signed-in restaurant, read-only.
  const { data } = await supabase.from("subscriptions").select("*").maybeSingle();

  const daysLeft = daysUntilEnd(data?.end_date);
  const status = data?.status ?? "trial";

  // A missing row is treated as a live trial rather than an expired one. 0009
  // backfills every restaurant, so this only fires if something went wrong —
  // and locking a paying pilot restaurant out of its own dashboard over our
  // bookkeeping error is the worse way to be wrong.
  const isActive = status === "active";
  const isTrial = status === "trial";

  const plan = { tier: data?.tier, status: data?.status, daysLeft };

  return {
    subscription: data ?? null,
    daysLeft,
    isTrial,
    isActive,
    isExpired: !isActive && status !== "past_due" && data !== null && daysLeft < 0,
    isEndingSoon: isTrial && daysLeft >= 0 && daysLeft <= WARN_WITHIN_DAYS,
    isPastDue: status === "past_due",
    canUsePro: canUsePro(plan),
    proLock: proLockReason(plan),
  };
});
