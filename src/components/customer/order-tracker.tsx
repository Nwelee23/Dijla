"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, CircleDashed, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { useOrderStatus } from "@/lib/hooks/use-order-status";
import { formatMoney, cn } from "@/lib/utils";

/** The steps a dine-in order walks through, in order. */
const STEPS = ["new", "accepted", "preparing", "ready"] as const;

export function OrderTracker({
  orderId,
  fallbackOrderNumber,
  qrToken,
  currency,
  onNewOrder,
}: {
  orderId: string;
  fallbackOrderNumber: number;
  /** Null for delivery and pickup — there is no table to call a waiter to. */
  qrToken: string | null;
  currency: string;
  onNewOrder: () => void;
}) {
  const t = useT();
  const live = useOrderStatus(orderId);
  const [isCalling, startCalling] = useTransition();
  const [called, setCalled] = useState(false);

  const status = live?.status ?? "new";
  const orderNumber = live?.orderNumber ?? fallbackOrderNumber;
  const currentStep = STEPS.indexOf(status as (typeof STEPS)[number]);
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";

  function callWaiter() {
    startCalling(async () => {
      try {
        const response = await fetch("/api/waiter-calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken }),
        });
        if (response.status === 429) {
          toast.error(t.track.waiterRateLimited);
          return;
        }
        if (!response.ok) {
          toast.error(t.track.waiterFailed);
          return;
        }
        setCalled(true);
        toast.success(t.track.waiterCalled);
      } catch {
        toast.error(t.track.waiterFailed);
      }
    });
  }

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">{t.order.orderNumber}</p>
        <p className="text-primary text-6xl font-bold tabular-nums">
          {orderNumber}
        </p>
      </div>

      {isCancelled ? (
        <div className="border-destructive/40 bg-destructive/5 flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
          <XCircle className="text-destructive size-10" />
          <p className="font-bold">{t.track.steps.cancelled}</p>
          <p className="text-muted-foreground text-sm">
            {t.track.cancelledBody}
          </p>
        </div>
      ) : (
        <ol className="space-y-1">
          {STEPS.map((step, index) => {
            // Delivered means every step behind it is done.
            const reached = isDelivered || index <= currentStep;
            const isCurrent = !isDelivered && index === currentStep;

            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 transition-colors",
                  isCurrent && "bg-primary/10"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    reached
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {reached ? (
                    <Check className="size-4" />
                  ) : (
                    <CircleDashed className="size-4" />
                  )}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    !reached && "text-muted-foreground",
                    isCurrent && "text-primary font-bold"
                  )}
                >
                  {t.track.steps[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {status === "ready" && (
        <p className="text-center font-medium text-emerald-700 dark:text-emerald-400">
          {t.track.readyBody}
        </p>
      )}

      {live && !isCancelled && (
        <div className="rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-sm">{t.track.amountDue}</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatMoney(live.total, currency)}
          </p>
          <p className="text-muted-foreground text-xs">{t.track.payCash}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {qrToken && !isCancelled && (
          <Button
            variant="outline"
            className="h-12"
            onClick={callWaiter}
            disabled={isCalling || called}
          >
            {isCalling ? (
              <Loader2 className="animate-spin" />
            ) : (
              <BellRing />
            )}
            {isCalling
              ? t.track.calling
              : called
                ? t.track.waiterCalled
                : t.track.callWaiter}
          </Button>
        )}

        <Button variant="ghost" onClick={onNewOrder}>
          {t.order.newOrder}
        </Button>
      </div>
    </div>
  );
}
