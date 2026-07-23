"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cancelOrder } from "@/app/dashboard/orders/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { interpolate } from "@/lib/i18n";

/**
 * Cancelling is the one destructive action on the board, so it takes a reason
 * and a confirm step (ORDERS_DASHBOARD_SPEC §8) — no one-tap cancel that a
 * mis-touch during a rush can trigger, and every cancellation is accountable.
 */
export function CancelOrderDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  onCancelled,
}: {
  orderId: string;
  orderNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await cancelOrder(orderId, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.orders.cancelled);
      onOpenChange(false);
      onCancelled?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {interpolate(t.orders.cancelTitle, { number: orderNumber })}
          </DialogTitle>
          <DialogDescription>{t.orders.cancelHint}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="cancel-reason">{t.orders.cancelReason}</Label>
            <Input
              id="cancel-reason"
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t.orders.cancelReasonPlaceholder}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t.orders.keepOrder}
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending || !reason.trim()}>
              {isPending ? <Loader2 className="animate-spin" /> : <X />}
              {t.orders.confirmCancel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
