"use client";

import Link from "next/link";
import { ArrowRight, ChefHat, Wifi, WifiOff } from "lucide-react";

import { KitchenCard } from "@/components/orders/kitchen-card";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { useRealtimeOrders, type LiveOrder } from "@/lib/hooks/use-realtime-orders";
import { useScreenWakeLock } from "@/lib/hooks/use-screen-wake-lock";
import { isActive } from "@/lib/order-status";
import type { PrepThresholds } from "@/lib/order-timing";
import { cn } from "@/lib/utils";

/** Oldest first — cook what has waited longest. */
const byOldest = (a: LiveOrder, b: LiveOrder) =>
  new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();

/**
 * The kitchen board (ORDERS_DASHBOARD_SPEC §6): a realtime, self-refreshing
 * screen for a tablet mounted on the wall. Requests a Screen Wake Lock so the
 * display never sleeps mid-service, and re-acquires it after the tab is hidden
 * (the lock is dropped automatically then).
 */
export function KitchenBoard({
  initialOrders,
  thresholds,
}: {
  initialOrders: LiveOrder[];
  thresholds: PrepThresholds;
}) {
  const t = useT();
  const { orders, isLive } = useRealtimeOrders(initialOrders);

  // The kitchen screen stays on the whole shift.
  useScreenWakeLock(true);

  const cooking = orders.filter((order) => isActive(order.status)).sort(byOldest);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ChefHat className="size-6" />
          {t.orders.kitchenTitle}
        </h1>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isLive
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          )}
        >
          {isLive ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {isLive ? t.orders.live : t.orders.reconnecting}
        </span>
        <Button asChild variant="ghost" size="sm" className="ms-auto">
          <Link href="/dashboard/orders">
            {t.orders.backToBoard}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      {cooking.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border py-20 text-center">
          <ChefHat className="size-12 opacity-40" />
          <p className="text-foreground text-lg font-medium">{t.orders.noOrders}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cooking.map((order) => (
            <KitchenCard key={order.id} order={order} thresholds={thresholds} />
          ))}
        </div>
      )}
    </div>
  );
}
