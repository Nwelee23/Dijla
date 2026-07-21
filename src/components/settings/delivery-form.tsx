"use client";

import { useState, useTransition } from "react";
import { Bike, Loader2, Store, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { updateDeliverySettings } from "@/app/dashboard/settings/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Restaurant } from "@/lib/restaurant";
import { formatMoney } from "@/lib/utils";

export function DeliveryForm({ restaurant }: { restaurant: Restaurant }) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  const [deliveryEnabled, setDeliveryEnabled] = useState(
    restaurant.delivery_enabled !== false
  );
  const [pickupEnabled, setPickupEnabled] = useState(
    restaurant.pickup_enabled !== false
  );
  const [deliveryFee, setDeliveryFee] = useState(
    String(restaurant.delivery_fee ?? 0)
  );
  const [minOrder, setMinOrder] = useState(String(restaurant.min_order ?? 0));

  const currency = restaurant.currency ?? "IQD";
  const bothOff = !deliveryEnabled && !pickupEnabled;

  function submit() {
    startTransition(async () => {
      const result = await updateDeliverySettings({
        deliveryEnabled,
        pickupEnabled,
        deliveryFee: Number(deliveryFee),
        minOrder: Number(minOrder),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.saved);
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ul className="divide-y rounded-lg border">
        <li className="flex items-center gap-3 p-3">
          <Bike className="text-muted-foreground size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.settings.deliveryEnabled}</p>
            <p className="text-muted-foreground text-xs">
              {t.settings.deliveryEnabledHint}
            </p>
          </div>
          <Switch
            checked={deliveryEnabled}
            onCheckedChange={setDeliveryEnabled}
            disabled={isPending}
            aria-label={t.settings.deliveryEnabled}
          />
        </li>

        <li className="flex items-center gap-3 p-3">
          <Store className="text-muted-foreground size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.settings.pickupEnabled}</p>
            <p className="text-muted-foreground text-xs">
              {t.settings.pickupEnabledHint}
            </p>
          </div>
          <Switch
            checked={pickupEnabled}
            onCheckedChange={setPickupEnabled}
            disabled={isPending}
            aria-label={t.settings.pickupEnabled}
          />
        </li>
      </ul>

      {bothOff && (
        // Not blocked — a dine-in-only restaurant is a real thing. But an owner
        // who did this by accident would only find out from a customer.
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {t.settings.bothChannelsOff}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="delivery-fee">{t.settings.deliveryFee}</Label>
          <Input
            id="delivery-fee"
            type="number"
            inputMode="numeric"
            min={0}
            step={250}
            dir="ltr"
            value={deliveryFee}
            onChange={(event) => setDeliveryFee(event.target.value)}
            disabled={isPending || !deliveryEnabled}
          />
          <p className="text-muted-foreground text-xs">
            {t.settings.deliveryFeeHint}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="min-order">{t.settings.minOrder}</Label>
          <Input
            id="min-order"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            dir="ltr"
            value={minOrder}
            onChange={(event) => setMinOrder(event.target.value)}
            disabled={isPending || !deliveryEnabled}
          />
          <p className="text-muted-foreground text-xs">
            {Number(minOrder) > 0
              ? formatMoney(Number(minOrder), currency)
              : t.settings.noMinOrder}
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        {t.common.save}
      </Button>
    </form>
  );
}
