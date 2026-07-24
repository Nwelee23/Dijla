"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, CircleDashed, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { useOrderStatus } from "@/lib/hooks/use-order-status";
import { trackingSteps, type OrderType } from "@/lib/order-status";
import { formatMoney, cn } from "@/lib/utils";

export function OrderTracker({
  orderId,
  fallbackOrderNumber,
  qrToken,
  type = "dine_in",
  currency,
  onNewOrder,
}: {
  orderId: string;
  fallbackOrderNumber: number;
  /** Null for delivery and pickup — there is no table to call a waiter to. */
  qrToken: string | null;
  type?: OrderType;
  currency: string;
  onNewOrder: () => void;
}) {
  const t = useT();
  const live = useOrderStatus(orderId);
  const [isCalling, startCalling] = useTransition();
  const [called, setCalled] = useState(false);

  const status = live?.status ?? "new";
  const orderNumber = live?.orderNumber ?? fallbackOrderNumber;
  const isCancelled = status === "cancelled";

  const steps = trackingSteps(type, status);
  const currentStep = steps.indexOf(status as (typeof steps)[number]);

  // Only where waiting for it means something different: a pickup customer
  // reads "ready" as "leave the house now", a diner as "look up".
  const overrides = (t.track.byType as Record<string, Record<string, string>>)[
    type
  ];
  const stepLabel = (step: string) =>
    overrides?.[step] ?? (t.track.steps as Record<string, string>)[step] ?? step;

  const byType = <T,>(map: Record<string, T>) => map[type] ?? map.dine_in;

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
          {steps.map((step, index) => {
            const reached = index <= currentStep;
            const isCurrent = index === currentStep;

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
                  {stepLabel(step)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {status === "ready" && (
        <p className="text-center font-medium text-emerald-700 dark:text-emerald-400">
          {byType(t.track.readyBody)}
        </p>
      )}

      {status === "out_for_delivery" && (
        <p
          className={cn(
            "text-center font-medium",
            live?.arrived
              ? "text-brand font-bold"
              : "text-violet-700 dark:text-violet-400"
          )}
        >
          {live?.arrived ? t.track.driverArrived : t.track.outForDeliveryBody}
        </p>
      )}

      {status === "delivered" && (
        <p className="text-muted-foreground text-center font-medium">
          {byType(t.track.deliveredBody)}
        </p>
      )}

      {live && !isCancelled && (
        <div className="rounded-xl border p-4 text-center">
          <p className="text-muted-foreground text-sm">{t.track.amountDue}</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatMoney(live.total, currency)}
          </p>
          <p className="text-muted-foreground text-xs">
            {byType(t.track.payCash)}
          </p>
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
