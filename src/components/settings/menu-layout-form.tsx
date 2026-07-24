"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { setMenuLayout } from "@/app/dashboard/settings/actions";
import { useT } from "@/components/i18n/i18n-provider";
import { MENU_LAYOUTS, type MenuLayoutSetting } from "@/lib/menu-layout";
import { cn } from "@/lib/utils";

/**
 * Pick how the customer menu renders (REDESIGN_V2_SPEC §8). Optimistic: the
 * choice highlights immediately and reverts if the save fails.
 */
export function MenuLayoutForm({ value }: { value: string }) {
  const t = useT();
  const [current, setCurrent] = useState(value);
  const [isPending, startTransition] = useTransition();

  function choose(layout: MenuLayoutSetting) {
    if (layout === current || isPending) return;
    const previous = current;
    setCurrent(layout);
    startTransition(async () => {
      const result = await setMenuLayout(layout);
      if (!result.ok) {
        toast.error(result.error);
        setCurrent(previous);
      } else {
        toast.success(t.settings.layoutSaved);
      }
    });
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {MENU_LAYOUTS.map((layout) => {
        const on = current === layout;
        return (
          <button
            key={layout}
            type="button"
            onClick={() => choose(layout)}
            disabled={isPending}
            aria-pressed={on}
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3 text-start transition-colors",
              on ? "border-brand bg-brand-muted" : "hover:bg-accent"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                on && "border-brand bg-brand text-brand-foreground"
              )}
            >
              {on && <Check className="size-3" />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{t.settings.layouts[layout]}</span>
              <span className="text-muted-foreground block text-xs">
                {t.settings.layoutHints[layout]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
