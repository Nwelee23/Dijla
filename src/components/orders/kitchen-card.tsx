"use client";

import { Loader2 } from "lucide-react";

import { ElapsedTimer } from "@/components/orders/elapsed-timer";
import { useOrderMove } from "@/components/orders/use-order-move";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n";
import { nextStatus, statusLabel, type OrderStatus } from "@/lib/order-status";
import type { LiveOrder } from "@/lib/hooks/use-realtime-orders";
import { orderItemOptions } from "@/lib/orders-select";
import type { PrepThresholds } from "@/lib/order-timing";

/** Statuses the kitchen itself drives — past `ready`, it is dispatch's job. */
const COOKING_NEXT = ["accepted", "preparing", "ready"];

/**
 * One order, kitchen-sized (ORDERS_DASHBOARD_SPEC §6): read from a metre away
 * with wet hands, so big type, the dish/quantity/note and a live timer — and no
 * prices, which a cook does not need. One large action button = the next
 * cooking step; once ready, the kitchen is done and shows no button.
 */
export function KitchenCard({
  order,
  thresholds,
}: {
  order: LiveOrder;
  thresholds: PrepThresholds;
}) {
  const t = useT();
  const { move, isPending } = useOrderMove();

  const status = order.status as OrderStatus;
  const next = nextStatus(status, order.type);
  const showAction = next && COOKING_NEXT.includes(next);

  return (
    <article className="flex flex-col rounded-xl border">
      <header className="flex items-center justify-between gap-2 border-b p-3">
        <span className="text-3xl font-black tabular-nums">{order.order_number}</span>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold">
            {order.type === "delivery"
              ? t.checkout.delivery
              : order.type === "pickup"
                ? t.checkout.pickup
                : order.tableNumber
                  ? interpolate(t.orders.table, { number: order.tableNumber })
                  : t.orders.dineIn}
          </span>
          <ElapsedTimer createdAt={order.created_at} thresholds={thresholds} className="text-base" />
        </div>
      </header>

      <ul className="flex-1 divide-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 p-3">
            <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl font-black tabular-nums">
              {item.quantity}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">{item.name_snapshot}</p>
              {orderItemOptions(item.options_snapshot).length > 0 && (
                <p className="text-muted-foreground text-sm">
                  {orderItemOptions(item.options_snapshot).map((o) => o.name).join(" · ")}
                </p>
              )}
              {item.notes && (
                <p className="text-destructive text-base font-semibold">{item.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showAction && (
        <div className="border-t p-3">
          <button
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-lg py-3 text-lg font-bold disabled:opacity-60"
            disabled={isPending}
            onClick={() => move(order.id, status, next as OrderStatus)}
          >
            {isPending && <Loader2 className="size-5 animate-spin" />}
            {interpolate(t.orders.advanceTo, { status: statusLabel(t, next as OrderStatus) })}
          </button>
        </div>
      )}
    </article>
  );
}
