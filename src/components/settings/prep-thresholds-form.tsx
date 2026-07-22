"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updatePrepThresholds } from "@/app/dashboard/settings/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readPrepThresholds } from "@/lib/order-timing";

/**
 * Configure the live board's warning/danger timer thresholds
 * (ORDERS_DASHBOARD_SPEC §3). Seeded from the restaurant's current settings (or
 * the 15/25 defaults).
 */
export function PrepThresholdsForm({ settings }: { settings: unknown }) {
  const t = useT();
  const initial = readPrepThresholds(settings);
  const [isPending, startTransition] = useTransition();
  const [warn, setWarn] = useState(String(initial.warnMinutes));
  const [danger, setDanger] = useState(String(initial.dangerMinutes));

  function submit() {
    startTransition(async () => {
      const result = await updatePrepThresholds(Number(warn), Number(danger));
      if (!result.ok) toast.error(result.error);
      else toast.success(t.settings.prepSaved);
    });
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="warn-minutes">{t.settings.prepWarn}</Label>
        <Input
          id="warn-minutes"
          type="number"
          inputMode="numeric"
          min={1}
          dir="ltr"
          value={warn}
          onChange={(event) => setWarn(event.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="danger-minutes">{t.settings.prepDanger}</Label>
        <Input
          id="danger-minutes"
          type="number"
          inputMode="numeric"
          min={2}
          dir="ltr"
          value={danger}
          onChange={(event) => setDanger(event.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {t.common.save}
        </Button>
      </div>
    </form>
  );
}
