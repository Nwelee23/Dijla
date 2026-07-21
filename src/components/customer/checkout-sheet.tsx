"use client";

import { useState } from "react";
import { Bike, Loader2, Store } from "lucide-react";

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
import { cn, formatMoney } from "@/lib/utils";

export type OrderType = "delivery" | "pickup";

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
  currency,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  deliveryFee: number;
  currency: string;
  isSubmitting: boolean;
  onSubmit: (details: CheckoutDetails) => void;
}) {
  const t = useT();

  const [type, setType] = useState<OrderType>("delivery");
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

  function submit() {
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
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as const).map((option) => (
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

          <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t.order.placing : t.order.place}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
