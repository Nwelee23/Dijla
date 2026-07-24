"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Inbox, Navigation, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { DriverOrderCard } from "@/components/driver/driver-order-card";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  useDriverOrders,
  type DriverOrder,
} from "@/lib/hooks/use-driver-orders";
import { useScreenWakeLock } from "@/lib/hooks/use-screen-wake-lock";
import { haversineKm, type LatLng } from "@/lib/haversine";
import { interpolate } from "@/lib/i18n";
import { armAudio, playOrderAlert } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "dijla:driver:sound";

export function DriverOrderList({
  initial,
  origin,
}: {
  initial: DriverOrder[];
  /** The restaurant location, to order deliveries by nearness (§C.2). */
  origin: LatLng | null;
}) {
  const t = useT();
  const { orders, isLive, setNewOrderHandler } = useDriverOrders(initial);
  const [soundOn, setSoundOn] = useState(false);
  const [byNearest, setByNearest] = useState(true);

  // Keep the phone awake while there is a delivery in hand — a driver navigating
  // should not have to keep tapping the screen alive (§C.1).
  useScreenWakeLock(orders.length > 0);

  // Distance from the restaurant to each destination (§C.2). Orders without a
  // pin get no distance and fall to the end when sorting by nearness.
  const withDistance = orders.map((order) => ({
    order,
    km:
      origin && order.customer_lat != null && order.customer_lng != null
        ? haversineKm(origin, {
            lat: Number(order.customer_lat),
            lng: Number(order.customer_lng),
          })
        : null,
  }));
  const canSortByNearest =
    origin != null && orders.length > 1 && withDistance.some((row) => row.km != null);
  const rows =
    byNearest && canSortByNearest
      ? [...withDistance].sort(
          (a, b) => (a.km ?? Infinity) - (b.km ?? Infinity)
        )
      : withDistance;

  // Audio only starts from a gesture, so the driver arms it once per shift.
  const enableSound = useCallback(async () => {
    const ok = await armAudio();
    if (!ok) {
      toast.error(t.driverApp.soundBlocked);
      return;
    }
    setSoundOn(true);
    try {
      window.localStorage.setItem(SOUND_KEY, "1");
    } catch {
      // Storage is a nudge for next time; failing to write it changes nothing.
    }
    playOrderAlert();
  }, [t]);

  useEffect(() => {
    setNewOrderHandler(() => {
      if (soundOn) playOrderAlert();
      // A driver is looking at the road, not the screen — a toast plus the sound
      // is the whole point of the app pushing rather than the driver checking.
      toast.success(t.driverApp.newAssignment);
    });
    return () => setNewOrderHandler(null);
  }, [soundOn, setNewOrderHandler, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isLive
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          )}
        >
          {isLive ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          {isLive ? t.driverApp.live : t.driverApp.reconnecting}
        </span>

        {canSortByNearest && (
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            onClick={() => setByNearest((value) => !value)}
          >
            {byNearest ? (
              <Navigation className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
            {byNearest ? t.driverApp.nearestFirst : t.driverApp.oldestFirst}
          </Button>
        )}

        <Button
          variant={soundOn ? "ghost" : "default"}
          size="sm"
          className={canSortByNearest ? undefined : "ms-auto"}
          onClick={soundOn ? () => setSoundOn(false) : enableSound}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
          {soundOn ? t.driverApp.soundOn : t.driverApp.soundOff}
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <Inbox className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.driverApp.noDeliveries}</p>
            <p className="text-sm">{t.driverApp.noDeliveriesHint}</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ order, km }) => (
            <li key={order.id} className="space-y-1">
              {km != null && (
                <p className="text-muted-foreground flex items-center gap-1 px-1 text-xs">
                  <Navigation className="size-3" />
                  {interpolate(t.driverApp.kmAway, { km: km.toFixed(1) })}
                </p>
              )}
              <DriverOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
