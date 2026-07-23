"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setTemporarilyClosed } from "@/app/dashboard/settings/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Switch } from "@/components/ui/switch";
import { isTemporarilyClosed } from "@/lib/opening";

/**
 * The manual "temporarily closed" switch (REMAINING_SCREENS §C.2) — flip it when
 * the kitchen is slammed or out of a staple, and every ordering channel stops
 * immediately, schedule notwithstanding. Optimistic, with a revert on failure.
 */
export function TemporarilyClosedSwitch({ settings }: { settings: unknown }) {
  const t = useT();
  const [closed, setClosed] = useState(isTemporarilyClosed(settings));
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setClosed(next);
    startTransition(async () => {
      const result = await setTemporarilyClosed(next);
      if (!result.ok) {
        setClosed(!next);
        toast.error(result.error);
        return;
      }
      toast.success(next ? t.settings.tempClosedOn : t.settings.tempClosedOff);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="font-medium">{t.settings.tempClosed}</p>
        <p className="text-muted-foreground text-xs">{t.settings.tempClosedHint}</p>
      </div>
      <Switch
        checked={closed}
        onCheckedChange={toggle}
        disabled={isPending}
        aria-label={t.settings.tempClosed}
      />
    </div>
  );
}
