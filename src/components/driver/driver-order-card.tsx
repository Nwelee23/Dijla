"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MapPin, Navigation, Phone, Package, PackageCheck } from "lucide-react";
import { toast } from "sonner";

import { markPickedUp } from "@/app/driver/actions";
import { MapThumb } from "@/components/orders/map-thumb";
import { DeliverSheet } from "@/components/driver/deliver-sheet";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { formatIraqiPhone } from "@/lib/auth/phone";
import type { DriverOrder } from "@/lib/hooks/use-driver-orders";
import { interpolate } from "@/lib/i18n";
import { navigationUrl } from "@/lib/map-tiles";
import { STATUS_STYLES, statusLabel } from "@/lib/order-status";
import { cn, formatMoney } from "@/lib/utils";

/**
 * One delivery in the driver's hands.
 *
 * Big, single-purpose controls: Navigate opens the phone's maps app at the pin,
 * Call rings the customer. Both are plain links that work with no server round
 * trip — a driver on the edge of coverage can still get moving. The status and
 * cash actions arrive in 4.5.
 */
export function DriverOrderCard({ order }: { order: DriverOrder }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [deliverOpen, setDeliverOpen] = useState(false);

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasPin = order.customer_lat !== null && order.customer_lng !== null;
  const isPaid = order.payment_status === "paid";

  const isReady = order.status === "ready";
  const isOut = order.status === "out_for_delivery";

  function pickUp() {
    startTransition(async () => {
      const result = await markPickedUp(order.id);
      if (!result.ok) toast.error(result.error);
      else toast.success(t.driverApp.pickedUpDone);
    });
  }

  return (
    <article className="space-y-3 rounded-2xl border p-4 shadow-sm">
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-xl font-bold tabular-nums">
          {interpolate(t.orders.orderNumber, { number: order.order_number })}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            STATUS_STYLES[order.status as keyof typeof STATUS_STYLES] ??
              STATUS_STYLES.ready
          )}
        >
          {statusLabel(t, order.status)}
        </span>
      </header>

      {order.customer_name && (
        <p className="font-semibold">{order.customer_name}</p>
      )}

      {order.customer_landmark && (
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          {order.customer_landmark}
        </p>
      )}

      {order.delivery_notes && (
        <p className="text-muted-foreground text-sm">{order.delivery_notes}</p>
      )}

      {hasPin && (
        <MapThumb
          lat={Number(order.customer_lat)}
          lng={Number(order.customer_lng)}
          width={320}
          height={150}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Package className="size-4" />
          {interpolate(t.driverApp.itemCount, { count: itemCount })}
        </span>
        <span
          className={cn(
            "rounded-lg px-2.5 py-1 font-bold tabular-nums",
            isPaid
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          )}
        >
          {isPaid
            ? t.driverApp.paid
            : interpolate(t.driverApp.collect, {
                amount: formatMoney(Number(order.total)),
              })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {hasPin ? (
          <Button asChild className="h-12">
            <a
              href={navigationUrl(Number(order.customer_lat), Number(order.customer_lng))}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation />
              {t.orders.navigate}
            </a>
          </Button>
        ) : (
          // No pin: the landmark is the address. Keep the grid balanced so Call
          // stays a full-width-feeling target rather than jumping columns.
          <span aria-hidden />
        )}

        {order.customer_phone && (
          <Button
            asChild
            variant="outline"
            className={cn("h-12", !hasPin && "col-span-2")}
          >
            <a href={`tel:${order.customer_phone}`} dir="ltr">
              <Phone />
              {formatIraqiPhone(order.customer_phone)}
            </a>
          </Button>
        )}
      </div>

      {/* The one forward action, sized to be tapped without looking. Which one
          it is depends on where the run has got to. */}
      {isReady && (
        <Button className="h-14 w-full text-base" disabled={isPending} onClick={pickUp}>
          {isPending ? <Loader2 className="animate-spin" /> : <PackageCheck />}
          {t.driverApp.pickedUp}
        </Button>
      )}

      {isOut && (
        <Button
          className="h-14 w-full text-base"
          disabled={isPending}
          onClick={() => setDeliverOpen(true)}
        >
          <Check />
          {t.driverApp.markDelivered}
        </Button>
      )}

      <DeliverSheet
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        orderId={order.id}
        total={Number(order.total)}
      />
    </article>
  );
}
