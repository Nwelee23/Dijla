"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setOrderStatus } from "@/app/dashboard/orders/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n";
import { statusLabel, type OrderStatus } from "@/lib/order-status";

/** The undo window on every status change (ORDERS_DASHBOARD_SPEC §5). */
const UNDO_MS = 10_000;

/**
 * Advance (or cancel) an order, with a 10-second undo on every change.
 *
 * During a rush staff tap the wrong card; without undo that becomes a complaint
 * in week one. The revert just moves the order back to where it was — the status
 * trigger (0007) records the compensating transition, so history stays truthful
 * about what actually happened rather than pretending the mis-tap never did.
 *
 * A hook, not a one-off, so the kitchen view can share the exact same behaviour.
 */
export function useOrderMove() {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  function move(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    onDone?: () => void
  ) {
    startTransition(async () => {
      const result = await setOrderStatus(orderId, to);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onDone?.();
      toast.success(interpolate(t.orders.movedTo, { status: statusLabel(t, to) }), {
        duration: UNDO_MS,
        action: {
          label: t.orders.undo,
          onClick: () => {
            void setOrderStatus(orderId, from).then((revert) => {
              if (!revert.ok) toast.error(revert.error);
              else toast.success(t.orders.reverted);
            });
          },
        },
      });
    });
  }

  return { move, isPending };
}
