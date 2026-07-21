"use client";

import { ShoppingBag } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

/**
 * Sticky summary of what the diner has chosen.
 *
 * Sits above the bottom safe area so it clears the iPhone home indicator, which
 * otherwise swallows the tap target on exactly the devices this runs on.
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
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Button
        className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3 px-4 text-base shadow-lg"
        onClick={onReview}
      >
        <span className="flex items-center gap-2">
          <ShoppingBag className="size-5" />
          <span className="bg-primary-foreground/20 rounded-full px-2 py-0.5 text-sm font-bold tabular-nums">
            {count}
          </span>
          {t.customer.reviewOrder}
        </span>
        <span className="font-bold tabular-nums">
          {formatMoney(subtotal, currency)}
        </span>
      </Button>
    </div>
  );
}
