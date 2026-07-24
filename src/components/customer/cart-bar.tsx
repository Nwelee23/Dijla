"use client";

import { ArrowRight, ShoppingBag } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { formatMoney } from "@/lib/utils";

/**
 * The floating cart pill (REDESIGN_V2_SPEC §4.7): a persistent rounded bar with
 * an item-count badge, the running total, and a forward arrow. Never scrolls
 * away.
 *
 * Sits above the bottom safe area so it clears the iPhone home indicator, which
 * otherwise swallows the tap target on exactly the devices this runs on. The
 * arrow points reading-forward: base `ArrowRight`, flipped in RTL so it always
 * leads toward checkout.
 */
export function CartBar({
  count,
  subtotal,
  currency,
  onReview,
}: {
  count: number;
  subtotal: number;
  currency: string;
  onReview: () => void;
}) {
  const t = useT();

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onReview}
        className="bg-brand text-brand-foreground pointer-events-auto mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 rounded-full px-4 text-base shadow-lg transition-transform active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-5" />
          <span className="bg-brand-foreground/20 rounded-full px-2 py-0.5 text-sm font-bold tabular-nums">
            {count}
          </span>
          {t.customer.reviewOrder}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-bold tabular-nums">
            {formatMoney(subtotal, currency)}
          </span>
          <ArrowRight className="size-5 rtl:-scale-x-100" />
        </span>
      </button>
    </div>
  );
}
