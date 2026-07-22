"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setSubscription } from "@/app/admin/actions";
import type { AdminRestaurant } from "@/components/admin/admin-restaurant-list";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TIERS = ["basic", "pro"] as const;
const STATUSES = ["trial", "active", "past_due", "cancelled"] as const;

/**
 * Set a restaurant's plan: tier, status and the period dates. Activation is
 * manual while there is no payment gateway, so this dialog is where "who paid"
 * is actually recorded.
 */
export function SubscriptionEditor({
  restaurant,
  onClose,
}: {
  restaurant: AdminRestaurant | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={restaurant !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* Keyed on the restaurant, so opening a different one remounts the form
            with that restaurant's plan as the initial state — no effect syncing
            props into state after the fact. */}
        {restaurant && (
          <EditorForm key={restaurant.id} restaurant={restaurant} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditorForm({
  restaurant,
  onClose,
}: {
  restaurant: AdminRestaurant;
  onClose: () => void;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  const [tier, setTier] = useState(restaurant.tier ?? "basic");
  const [status, setStatus] = useState(restaurant.status ?? "trial");
  const [amount, setAmount] = useState(
    restaurant.amount != null ? String(restaurant.amount) : ""
  );
  const [startDate, setStartDate] = useState(restaurant.start_date ?? "");
  const [endDate, setEndDate] = useState(restaurant.end_date ?? "");
  const [reason, setReason] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await setSubscription(restaurant.id, {
        tier,
        status,
        amount: amount.trim() === "" ? null : Number(amount),
        startDate: startDate || null,
        endDate: endDate || null,
        cancellationReason: reason.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.admin.planSaved);
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t.admin.editPlan} · {restaurant.name}
        </DialogTitle>
      </DialogHeader>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-2">
          <Label>{t.admin.tier}</Label>
          <div className="grid grid-cols-2 gap-2">
            {TIERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTier(option)}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  tier === option
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                {option === "pro" ? t.admin.pro : t.admin.basic}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t.admin.status}</Label>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  status === option
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                {t.admin.statuses[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sub-amount">{t.admin.monthlyAmount}</Label>
          <Input
            id="sub-amount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            dir="ltr"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">{t.admin.monthlyAmountHint}</p>
        </div>

        {status === "cancelled" && (
          <div className="grid gap-2">
            <Label htmlFor="churn-reason">{t.admin.churnReason}</Label>
            <Input
              id="churn-reason"
              placeholder={t.admin.churnReasonHint}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="start-date" className="text-xs">
              {t.admin.startDate}
            </Label>
            <Input
              id="start-date"
              type="date"
              dir="ltr"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="end-date" className="text-xs">
              {t.admin.endDate}
            </Label>
            <Input
              id="end-date"
              type="date"
              dir="ltr"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
