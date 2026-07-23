"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Archive, BellRing, ChefHat, ClipboardList, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { OrderCard } from "@/components/orders/order-card";
import { WaiterCalls, type Call } from "@/components/orders/waiter-calls";
import { Button } from "@/components/ui/button";
import { useLiveDrivers } from "@/lib/hooks/use-live-drivers";
import {
  useRealtimeOrders,
  type LiveOrder,
  type OrderDriver,
} from "@/lib/hooks/use-realtime-orders";
import { interpolate } from "@/lib/i18n";
import { isActive, statusLabel } from "@/lib/order-status";
import type { PrepThresholds } from "@/lib/order-timing";
import { armAudio, playOrderAlert } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "dijla:orders:sound";

/**
 * The three kanban lanes (ORDERS_DASHBOARD_SPEC §1). `accepted` shares the
 * preparing lane and `out_for_delivery` shares ready, so every active order has
 * exactly one home and the board stays three columns wide.
 */
const BOARD_COLUMNS = [
  { key: "new", statuses: ["new"] },
  { key: "preparing", statuses: ["accepted", "preparing"] },
  { key: "ready", statuses: ["ready", "out_for_delivery"] },
] as const;

/** Oldest first within a lane — act on what has waited longest. */
const byOldest = (a: LiveOrder, b: LiveOrder) =>
  new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();

export function OrderBoard({
  initialOrders,
  initialCalls,
  drivers: initialDrivers,
  thresholds,
}: {
  initialOrders: LiveOrder[];
  initialCalls: Call[];
  drivers: OrderDriver[];
  thresholds: PrepThresholds;
}) {
  const t = useT();
  const drivers = useLiveDrivers(initialDrivers);
  const {
    orders,
    isLive,
    unseen,
    acknowledge,
    acknowledgeAll,
    setNewOrderHandler,
    setResyncHandler,
  } = useRealtimeOrders(initialOrders);

  const [soundOn, setSoundOn] = useState(false);

  // Browsers only start audio from a gesture, so this cannot be restored
  // silently on load — the operator has to press the button once per session.
  const enableSound = useCallback(async () => {
    const ok = await armAudio();
    if (!ok) {
      toast.error(t.orders.soundBlocked);
      return;
    }
    setSoundOn(true);
    try {
      window.localStorage.setItem(SOUND_KEY, "1");
    } catch {
      // Storage is only used to nudge next time; not being able to write is fine.
    }
    playOrderAlert();
  }, [t]);

  useEffect(() => {
    setNewOrderHandler(() => {
      if (soundOn) playOrderAlert();
    });
    return () => setNewOrderHandler(null);
  }, [soundOn, setNewOrderHandler]);

  useEffect(() => {
    setResyncHandler((count) =>
      toast.success(interpolate(t.orders.resynced, { count }))
    );
    return () => setResyncHandler(null);
  }, [setResyncHandler, t]);

  // Re-sound every 20s while orders sit unacknowledged (§4): a single chime is
  // easy to miss over a fryer. Acknowledging clears `unseen` and stops it.
  useEffect(() => {
    if (!soundOn || unseen.size === 0) return;
    const id = setInterval(() => playOrderAlert(), 20_000);
    return () => clearInterval(id);
  }, [soundOn, unseen.size]);

  // Visual fallback that survives a muted tab (§4): a count in the tab title, so
  // a backgrounded board still shows "(2)" next to the name. Cleanup restores
  // the real title, so the prefix never stacks as the count changes.
  useEffect(() => {
    if (unseen.size === 0) return;
    const original = document.title;
    document.title = `(${unseen.size}) ${original}`;
    return () => {
      document.title = original;
    };
  }, [unseen.size]);

  const active = orders.filter((order) => isActive(order.status));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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

        {/* Visual first: the board must never depend on sound to be noticed. */}
        <Button
          variant={soundOn ? "ghost" : "default"}
          size="sm"
          onClick={soundOn ? () => setSoundOn(false) : enableSound}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
          {soundOn ? t.orders.soundOn : t.orders.soundOff}
        </Button>

        <div className="ms-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/orders/kitchen">
              <ChefHat />
              {t.orders.kitchen}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/orders/archive">
              <Archive />
              {t.orders.archive}
            </Link>
          </Button>
        </div>
      </div>

      <WaiterCalls initialCalls={initialCalls} />

      {unseen.size > 0 && (
        <div className="bg-primary text-primary-foreground flex items-center gap-3 rounded-xl p-3 shadow">
          <BellRing className="size-5 shrink-0 animate-pulse" />
          <span className="flex-1 font-bold">
            {interpolate(t.orders.unseenCount, { count: unseen.size })}
          </span>
          <Button variant="secondary" size="sm" onClick={acknowledgeAll}>
            {t.orders.acknowledgeAll}
          </Button>
        </div>
      )}

      {active.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border py-16 text-center">
          <ClipboardList className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.orders.noOrders}</p>
            <p className="text-sm">{t.orders.noOrdersHint}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {BOARD_COLUMNS.map((column) => {
            const cards = active
              .filter((order) => (column.statuses as readonly string[]).includes(order.status))
              .sort(byOldest);
            return (
              <section key={column.key} className="space-y-3">
                <header className="flex items-center justify-between gap-2 border-b pb-2">
                  <h2 className="text-sm font-bold">{statusLabel(t, column.key)}</h2>
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
                    {cards.length}
                  </span>
                </header>
                {cards.length === 0 ? (
                  <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-xs">
                    {t.orders.laneEmpty}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cards.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        drivers={drivers}
                        thresholds={thresholds}
                        isUnseen={unseen.has(order.id)}
                        onAcknowledge={() => acknowledge(order.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
