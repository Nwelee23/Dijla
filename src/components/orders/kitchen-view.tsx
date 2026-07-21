"use client";

import { ChefHat } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import type { LiveOrder } from "@/lib/hooks/use-realtime-orders";
import { interpolate } from "@/lib/i18n";
import { STATUS_STYLES, statusLabel, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/utils";

/**
 * What to cook, and nothing else.
 *
 * No prices, no totals — a cook reads this from a metre away with their hands
 * full, so it carries only the dish, the quantity and the note, at a size that
 * survives that distance.
 */
export function KitchenView({ orders }: { orders: LiveOrder[] }) {
  const t = useT();

  if (orders.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border py-16 text-center">
        <ChefHat className="size-10 opacity-40" />
        <p className="text-foreground font-medium">{t.orders.noOrders}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <article key={order.id} className="rounded-xl border">
          <header className="flex items-center justify-between gap-2 border-b p-3">
            <span className="text-3xl font-black tabular-nums">
              {order.order_number}
            </span>
            <div className="text-end">
              <p className="text-lg font-bold">
                {order.tableNumber
                  ? interpolate(t.orders.table, { number: order.tableNumber })
                  : t.orders.noTable}
              </p>
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                  STATUS_STYLES[order.status as OrderStatus] ?? STATUS_STYLES.new
                )}
              >
                {statusLabel(t, order.status)}
              </span>
            </div>
          </header>

          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 p-3">
                <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl font-black tabular-nums">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-tight">
                    {item.name_snapshot}
                  </p>
                  {item.notes && (
                    <p className="text-destructive text-base font-semibold">
                      {item.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
