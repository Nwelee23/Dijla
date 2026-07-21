"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { DriverOrderCard } from "@/components/driver/driver-order-card";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  useDriverOrders,
  type DriverOrder,
} from "@/lib/hooks/use-driver-orders";
import { armAudio, playOrderAlert } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SOUND_KEY = "dijla:driver:sound";

export function DriverOrderList({ initial }: { initial: DriverOrder[] }) {
  const t = useT();
  const { orders, isLive, setNewOrderHandler } = useDriverOrders(initial);
  const [soundOn, setSoundOn] = useState(false);

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

        <Button
          variant={soundOn ? "ghost" : "default"}
          size="sm"
          className="ms-auto"
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
          {orders.map((order) => (
            <li key={order.id}>
              <DriverOrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
