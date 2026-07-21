"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { completeDelivery } from "@/app/driver/actions";
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
import { formatMoney } from "@/lib/utils";

/**
 * Confirms cash and closes a delivery in one step.
 *
 * Cash on delivery has no separate "delivered" and "paid" moment — the driver
 * hands over the food and takes the money at once. So marking delivered is where
 * the amount is confirmed, defaulted to the bill and editable only downward for
 * the case where the customer was short. The server re-checks the bound.
 */
export function DeliverSheet({
  open,
  onOpenChange,
  orderId,
  total,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  total: number;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(total));

  // Reset on close rather than in an effect: next time it opens it starts from
  // the bill again, not whatever a half-finished attempt left in the field.
  function handleOpenChange(next: boolean) {
    if (!next) setAmount(String(total));
    onOpenChange(next);
  }

  function confirm() {
    const cash = Number(amount);
    startTransition(async () => {
      const result = await completeDelivery(orderId, cash);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      handleOpenChange(false);
      toast.success(t.driverApp.deliveredDone);
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader className="text-start">
          <SheetTitle>{t.driverApp.confirmDelivery}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div className="rounded-xl border p-4 text-center">
            <p className="text-muted-foreground text-sm">{t.driverApp.amountDue}</p>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(total)}</p>
            <p className="text-muted-foreground text-xs">{t.driverApp.cashOnly}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cash">{t.driverApp.cashCollected}</Label>
            <Input
              id="cash"
              type="number"
              inputMode="numeric"
              min={0}
              max={total}
              step={250}
              dir="ltr"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">{t.driverApp.cashHint}</p>
          </div>

          <Button
            className="h-14 w-full text-base"
            disabled={isPending}
            onClick={confirm}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Check />}
            {t.driverApp.confirmDeliveredCollected}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
