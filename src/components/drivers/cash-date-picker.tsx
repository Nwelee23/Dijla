"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, baghdadToday } from "@/lib/report-range";

/**
 * The reconciliation day lives in the URL, like the reports range: the page is
 * a server component that runs the aggregate, so moving between days is a
 * navigation and the totals are always the server's.
 */
export function CashDatePicker({ date }: { date: string }) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = baghdadToday();

  function goto(next: string) {
    // Never past today: there is no cash to reconcile for a day yet to come.
    if (next > today) return;
    startTransition(() => router.push(`/dashboard/drivers?date=${next}`));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        disabled={isPending}
        aria-label={t.cash.prevDay}
        onClick={() => goto(addDays(date, -1))}
      >
        <ChevronRight className="rtl:hidden" />
        <ChevronLeft className="hidden rtl:block" />
      </Button>

      <Input
        type="date"
        dir="ltr"
        className="w-40"
        value={date}
        max={today}
        disabled={isPending}
        onChange={(event) => event.target.value && goto(event.target.value)}
      />

      <Button
        variant="outline"
        size="icon"
        className="size-9"
        disabled={isPending || date >= today}
        aria-label={t.cash.nextDay}
        onClick={() => goto(addDays(date, 1))}
      >
        <ChevronLeft className="rtl:hidden" />
        <ChevronRight className="hidden rtl:block" />
      </Button>

      {isPending && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
    </div>
  );
}
