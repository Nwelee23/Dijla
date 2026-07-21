"use client";

import { useState, useTransition } from "react";
import { Loader2, Moon } from "lucide-react";
import { toast } from "sonner";

import { updateOpeningHours } from "@/app/dashboard/settings/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { interpolate } from "@/lib/i18n";
import {
  DAYS,
  crossesMidnight,
  type DayKey,
  type OpeningHours,
} from "@/lib/hours";
import { cn } from "@/lib/utils";

export function HoursForm({ initial }: { initial: OpeningHours }) {
  const t = useT();
  const [hours, setHours] = useState<OpeningHours>(initial);
  const [isPending, startTransition] = useTransition();

  function update(day: DayKey, patch: Partial<OpeningHours[DayKey]>) {
    setHours((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
  }

  function copyToAll() {
    const saturday = hours.sat;
    setHours(
      Object.fromEntries(
        DAYS.map((day) => [day.key, { ...saturday }])
      ) as OpeningHours
    );
  }

  function submit() {
    startTransition(async () => {
      const result = await updateOpeningHours(hours);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.settings.hoursSaved);
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ul className="divide-y rounded-lg border">
        {DAYS.map((day) => {
          const value = hours[day.key];
          const label = t.days[day.key];

          return (
            <li
              key={day.key}
              className={cn(
                "flex flex-wrap items-center gap-3 p-3",
                value.closed && "bg-muted/40"
              )}
            >
              <span className="w-20 shrink-0 text-sm font-medium">{label}</span>

              <Switch
                checked={!value.closed}
                onCheckedChange={(open) => update(day.key, { closed: !open })}
                disabled={isPending}
                aria-label={interpolate(t.settings.openDay, { day: label })}
              />

              {value.closed ? (
                <span className="text-muted-foreground text-sm">
                  {t.settings.closed}
                </span>
              ) : (
                // Times read left-to-right in every language.
                <div className="flex items-center gap-2" dir="ltr">
                  <Input
                    type="time"
                    className="w-28"
                    value={value.open}
                    onChange={(event) =>
                      update(day.key, { open: event.target.value })
                    }
                    disabled={isPending}
                    aria-label={interpolate(t.settings.openAt, { day: label })}
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="time"
                    className="w-28"
                    value={value.close}
                    onChange={(event) =>
                      update(day.key, { close: event.target.value })
                    }
                    disabled={isPending}
                    aria-label={interpolate(t.settings.closeAt, { day: label })}
                  />
                </div>
              )}

              {crossesMidnight(value) && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Moon className="size-3" />
                  {t.settings.crossesMidnight}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {t.settings.saveHours}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={copyToAll}
          disabled={isPending}
        >
          {t.settings.copyToAllDays}
        </Button>
      </div>
    </form>
  );
}
