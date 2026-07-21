"use client";

import { useState } from "react";
import { Bike, Loader2, Store, TriangleAlert } from "lucide-react";

import { LocationPicker, type Pin } from "@/components/customer/location-picker";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { interpolate } from "@/lib/i18n";
import type { OrderType as AnyOrderType } from "@/lib/order-status";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The two a public link offers. Dine-in is not a choice made here — it comes
 * from having scanned a table's QR code. Derived rather than retyped so the
 * toggle cannot drift from the statuses the kitchen board knows.
 */
export type OrderType = Exclude<AnyOrderType, "dine_in">;

export type CheckoutDetails = {
  type: OrderType;
  name: string;
  phone: string;
  landmark: string;
  notes: string;
  pin: Pin | null;
};

export function CheckoutSheet({
  open,
  onOpenChange,
  subtotal,
  deliveryFee,
  minOrder,
  offered,
  currency,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  deliveryFee: number;
  /** Delivery only. 0 means no minimum. */
  minOrder: number;
  /** The channels this restaurant takes. Never empty — the caller checks. */
  offered: readonly OrderType[];
  currency: string;
  isSubmitting: boolean;
  onSubmit: (details: CheckoutDetails) => void;
}) {
  const t = useT();

  // Whatever the owner offers, preferring delivery. Starting on a channel that
  // is switched off would show a customer a form they cannot submit.
  const [type, setType] = useState<OrderType>(offered[0] ?? "delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [landmark, setLandmark] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState<Pin | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDelivery = type === "delivery";
  // Pickup carries no fee: the customer is coming to the restaurant.
  const fee = isDelivery ? deliveryFee : 0;
  const total = subtotal + fee;

  // Measured against the food, matching the server: the fee cannot help a
  // basket clear the floor that exists to make the trip worth driving.
  const shortfall = isDelivery && minOrder > 0 ? minOrder - subtotal : 0;
  const belowMinimum = shortfall > 0;

  function submit() {
    if (belowMinimum) return setError(t.checkout.belowMinOrder);
    if (!name.trim()) return setError(t.checkout.needName);
    if (!phone.trim()) return setError(t.checkout.needPhone);

    // A pin or a landmark, ideally both. Iraqi addresses are not navigable, so
    // an order with neither is one the driver cannot deliver.
    if (isDelivery && !pin && !landmark.trim()) {
      return setError(t.checkout.needLocation);
    }

    setError(null);
    onSubmit({ type, name, phone, landmark, notes, pin });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle>{t.checkout.title}</SheetTitle>
        </SheetHeader>

        <form
          className="space-y-5 px-4 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {/* One channel offered means no choice to make — a toggle with a
              single option is a decision the customer cannot get wrong, and
              does not need to be asked about. */}
          {offered.length > 1 && (
            <div className="grid grid-cols-2 gap-2">
              {offered.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition-colors",
                    type === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent"
                  )}
                >
                  {option === "delivery" ? <Bike className="size-4" /> : <Store className="size-4" />}
                  {option === "delivery" ? t.checkout.delivery : t.checkout.pickup}
                </button>
              ))}
            </div>
          )}

          {belowMinimum && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {interpolate(t.checkout.minOrderShortfall, {
                minimum: formatMoney(minOrder, currency),
                missing: formatMoney(shortfall, currency),
              })}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="checkout-name">{t.checkout.name}</Label>
            <Input
              id="checkout-name"
              required
              placeholder={t.checkout.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="checkout-phone">{t.checkout.phone}</Label>
            <Input
              id="checkout-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              required
              placeholder={t.common.phonePlaceholder}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {isDelivery && (
            <>
              <div className="grid gap-2">
                <Label>{t.checkout.location}</Label>
                <LocationPicker value={pin} onChange={setPin} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="checkout-landmark">{t.checkout.landmark}</Label>
                <Input
                  id="checkout-landmark"
                  placeholder={t.checkout.landmarkPlaceholder}
                  value={landmark}
                  onChange={(event) => setLandmark(event.target.value)}
                  disabled={isSubmitting}
                  maxLength={160}
                />
                <p className="text-muted-foreground text-xs">
                  {t.checkout.landmarkHelp}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="checkout-notes">{t.checkout.notes}</Label>
                <Input
                  id="checkout-notes"
                  placeholder={t.checkout.notesPlaceholder}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={isSubmitting}
                  maxLength={160}
                />
              </div>
            </>
          )}

          <div className="space-y-1 rounded-xl border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.checkout.subtotal}</span>
              <span className="tabular-nums">{formatMoney(subtotal, currency)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.checkout.deliveryFee}</span>
                <span className="tabular-nums">{formatMoney(fee, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <span>{t.checkout.total}</span>
              <span className="tabular-nums">{formatMoney(total, currency)}</span>
            </div>
            <p className="text-muted-foreground pt-1 text-xs">{t.checkout.payCash}</p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            className="h-12 w-full text-base"
            disabled={isSubmitting || belowMinimum}
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t.order.placing : t.order.place}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
