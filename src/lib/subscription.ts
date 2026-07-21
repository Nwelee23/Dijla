import "server-only";

import { cache } from "react";

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
};

/** When the countdown starts being shown as a warning rather than a note. */
const WARN_WITHIN_DAYS = 7;

function daysUntil(endDate: string | null): number {
  if (!endDate) return 0;

  // Compare against the end of that day, not the instant: a trial ending
  // "today" should read as the last day, not as expired because it is now the
  // afternoon.
  //
  // Floor, not ceil: with ceil, the six hours left in today count as a whole
  // extra day, so a fresh 30-day trial greets the owner with "31 days left" and
  // its final day reads "1 day left" instead of "today is the last day".
  const end = new Date(`${endDate}T23:59:59`);
  return Math.floor((end.getTime() - Date.now()) / 86_400_000);
}

export const getSubscription = cache(async (): Promise<SubscriptionState> => {
  const supabase = await createClient();
  // RLS scopes this to the signed-in restaurant, read-only.
  const { data } = await supabase.from("subscriptions").select("*").maybeSingle();

  const daysLeft = daysUntil(data?.end_date ?? null);
  const status = data?.status ?? "trial";

  // A missing row is treated as a live trial rather than an expired one. 0009
  // backfills every restaurant, so this only fires if something went wrong —
  // and locking a paying pilot restaurant out of its own dashboard over our
  // bookkeeping error is the worse way to be wrong.
  const isActive = status === "active";
  const isTrial = status === "trial";

  return {
    subscription: data ?? null,
    daysLeft,
    isTrial,
    isActive,
    isExpired: !isActive && data !== null && daysLeft < 0,
    isEndingSoon: isTrial && daysLeft >= 0 && daysLeft <= WARN_WITHIN_DAYS,
  };
});
