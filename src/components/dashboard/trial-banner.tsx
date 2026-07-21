import { CalendarClock } from "lucide-react";

import { interpolate } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import type { SubscriptionState } from "@/lib/subscription";
import { cn } from "@/lib/utils";

/** A quiet note most of the month, louder in the last week. */
export async function TrialBanner({ state }: { state: SubscriptionState }) {
  const t = await getT();

  if (!state.isTrial || state.daysLeft < 0) return null;

  const message =
    state.daysLeft === 0
      ? t.trial.lastDay
      : interpolate(t.trial.daysLeft, { count: state.daysLeft });

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-4 py-2 text-sm",
        state.isEndingSoon
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          : "bg-muted/50 text-muted-foreground"
      )}
    >
      <CalendarClock className="size-4 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}
