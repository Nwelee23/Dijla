"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, ClipboardList, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { KitchenView } from "@/components/orders/kitchen-view";
import { OrderCard } from "@/components/orders/order-card";
import { WaiterCalls, type Call } from "@/components/orders/waiter-calls";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveDrivers } from "@/lib/hooks/use-live-drivers";
import {
  useRealtimeOrders,
  type LiveOrder,
  type OrderDriver,
} from "@/lib/hooks/use-realtime-orders";
import { interpolate } from "@/lib/i18n";
import { isActive } from "@/lib/order-status";
import type { PrepThresholds } from "@/lib/order-timing";
import { armAudio, playOrderAlert } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "dijla:orders:sound";

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
  } = useRealtimeOrders(initialOrders);

  const [soundOn, setSoundOn] = useState(false);
  const [showDone, setShowDone] = useState(false);

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

  const active = orders.filter((order) => isActive(order.status));
  const done = orders.filter((order) => !isActive(order.status));
  const visible = showDone ? [...active, ...done] : active;

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

        <Button
          variant="ghost"
          size="sm"
          className="ms-auto"
          onClick={() => setShowDone((current) => !current)}
        >
          {showDone ? t.orders.hideDone : t.orders.showDone}
        </Button>
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

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">{t.orders.board}</TabsTrigger>
          <TabsTrigger value="kitchen">{t.orders.kitchen}</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="pt-4">
          {visible.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border py-16 text-center">
              <ClipboardList className="size-10 opacity-40" />
              <div className="space-y-1">
                <p className="text-foreground font-medium">{t.orders.noOrders}</p>
                <p className="text-sm">{t.orders.noOrdersHint}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((order) => (
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
        </TabsContent>

        <TabsContent value="kitchen" className="pt-4">
          <KitchenView orders={active} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
