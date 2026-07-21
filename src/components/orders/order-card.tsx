"use client";

import { useTransition } from "react";
import { Bike, ChevronLeft, Clock, Loader2, MapPin, Navigation, Phone, Store, User, X } from "lucide-react";
import { toast } from "sonner";

import { setOrderStatus } from "@/app/dashboard/orders/actions";
import { MapThumb } from "@/components/orders/map-thumb";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { interpolate } from "@/lib/i18n";
import type { LiveOrder } from "@/lib/hooks/use-realtime-orders";
import { formatIraqiPhone } from "@/lib/auth/phone";
import { navigationUrl } from "@/lib/map-tiles";
import {
  STATUS_STYLES,
  nextStatus,
  statusLabel,
  type OrderStatus,
} from "@/lib/order-status";
import { formatMoney, cn } from "@/lib/utils";

function elapsed(t: ReturnType<typeof useT>, createdAt: string | null) {
  if (!createdAt) return "";
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);

  if (minutes < 1) return t.orders.justNow;
  if (minutes < 60) return interpolate(t.orders.minutesAgo, { count: minutes });
  return interpolate(t.orders.hoursAgo, { count: Math.floor(minutes / 60) });
}

export function OrderCard({
  order,
  isUnseen,
  onAcknowledge,
}: {
  order: LiveOrder;
  isUnseen: boolean;
  onAcknowledge: () => void;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  const status = order.status as OrderStatus;
  const next = nextStatus(status, order.type);

  const isDelivery = order.type === "delivery";
  const isPickup = order.type === "pickup";
  const hasPin = order.customer_lat !== null && order.customer_lng !== null;

  function move(to: OrderStatus) {
    startTransition(async () => {
      const result = await setOrderStatus(order.id, to);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(t.orders.updated);
        onAcknowledge();
      }
    });
  }

  return (
    <article
      onClick={isUnseen ? onAcknowledge : undefined}
      className={cn(
        "space-y-3 rounded-xl border p-4 transition-colors",
        // An unacknowledged order is loud on purpose — this card has to win
        // against a busy counter, from across the room.
        isUnseen && "border-primary ring-primary/30 bg-primary/5 ring-2"
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold tabular-nums">
          {interpolate(t.orders.orderNumber, { number: order.order_number })}
        </span>

        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            STATUS_STYLES[status] ?? STATUS_STYLES.new
          )}
        >
          {statusLabel(t, order.status)}
        </span>

        {isUnseen && (
          <span className="bg-primary text-primary-foreground animate-pulse rounded-full px-2.5 py-1 text-xs font-bold">
            {t.orders.newBadge}
          </span>
        )}

        <span className="text-muted-foreground ms-auto flex items-center gap-1 text-sm">
          <Clock className="size-3.5" />
          {elapsed(t, order.created_at)}
        </span>
      </header>

      {isDelivery || isPickup ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-semibold">
            {isDelivery ? <Bike className="size-4" /> : <Store className="size-4" />}
            {isDelivery ? t.checkout.delivery : t.checkout.pickup}
          </p>

          {order.customer_name && (
            <p className="flex items-center gap-2 text-sm">
              <User className="text-muted-foreground size-4 shrink-0" />
              {order.customer_name}
            </p>
          )}

          {order.customer_phone && (
            // Tap to call: staff ring the customer from the same screen rather
            // than copying a number into the phone app mid-service.
            <a
              href={`tel:${order.customer_phone}`}
              className="text-primary flex items-center gap-2 font-medium"
              dir="ltr"
            >
              <Phone className="size-4 shrink-0" />
              {formatIraqiPhone(order.customer_phone)}
            </a>
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

          {isDelivery && hasPin && (
            <div className="space-y-2">
              <MapThumb
                lat={Number(order.customer_lat)}
                lng={Number(order.customer_lng)}
              />
              <Button asChild variant="outline" size="sm">
                <a
                  href={navigationUrl(Number(order.customer_lat), Number(order.customer_lng))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation />
                  {t.orders.navigate}
                </a>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="font-semibold">
          {order.tableNumber
            ? interpolate(t.orders.table, { number: order.tableNumber })
            : t.orders.noTable}
        </p>
      )}

      <ul className="space-y-1.5">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span className="bg-muted min-w-7 rounded px-1.5 py-0.5 text-center font-bold tabular-nums">
              {item.quantity}
            </span>
            <span className="flex-1">
              {item.name_snapshot}
              {item.notes && (
                // The note is why the dish comes back if it is missed.
                <span className="text-destructive block text-sm font-medium">
                  {item.notes}
                </span>
              )}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatMoney(Number(item.price_snapshot) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <div>
          {Number(order.delivery_fee) > 0 && (
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatMoney(Number(order.subtotal))} + {t.checkout.deliveryFee}{" "}
              {formatMoney(Number(order.delivery_fee))}
            </p>
          )}
          <span className="text-lg font-bold tabular-nums">
            {formatMoney(Number(order.total))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status !== "cancelled" && status !== "delivered" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={isPending}
              onClick={() => move("cancelled")}
            >
              <X />
              {t.orders.cancel}
            </Button>
          )}

          {next && (
            <Button disabled={isPending} onClick={() => move(next)}>
              {isPending ? <Loader2 className="animate-spin" /> : <ChevronLeft className="rtl:rotate-180" />}
              {interpolate(t.orders.advanceTo, { status: statusLabel(t, next) })}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
