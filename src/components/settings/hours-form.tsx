"use client";

import { useState, useTransition } from "react";
import { Loader2, Moon } from "lucide-react";
import { toast } from "sonner";

import { updateOpeningHours } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DAYS,
  crossesMidnight,
  type DayKey,
  type OpeningHours,
} from "@/lib/hours";
import { cn } from "@/lib/utils";

export function HoursForm({ initial }: { initial: OpeningHours }) {
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
      toast.success("تم حفظ أوقات العمل");
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
          return (
            <li
              key={day.key}
              className={cn(
                "flex flex-wrap items-center gap-3 p-3",
                value.closed && "bg-muted/40"
              )}
            >
              <span className="w-16 shrink-0 text-sm font-medium">
                {day.label}
              </span>

              <Switch
                checked={!value.closed}
                onCheckedChange={(open) => update(day.key, { closed: !open })}
                disabled={isPending}
                aria-label={`فتح ${day.label}`}
              />

              {value.closed ? (
                <span className="text-muted-foreground text-sm">مغلق</span>
              ) : (
                <div className="flex items-center gap-2" dir="ltr">
                  <Input
                    type="time"
                    className="w-28"
                    value={value.open}
                    onChange={(event) =>
                      update(day.key, { open: event.target.value })
                    }
                    disabled={isPending}
                    aria-label={`وقت الفتح ${day.label}`}
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
                    aria-label={`وقت الإغلاق ${day.label}`}
                  />
                </div>
              )}

              {crossesMidnight(value) && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Moon className="size-3" />
                  يمتد بعد منتصف الليل
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          حفظ أوقات العمل
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={copyToAll}
          disabled={isPending}
        >
          تطبيق توقيت السبت على كل الأيام
        </Button>
      </div>
    </form>
  );
}
