"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RANGE_KEYS, type RangeKey } from "@/lib/report-range";
import { cn } from "@/lib/utils";

/**
 * The range lives in the URL, not component state: the page is a server
 * component that reads it and runs the aggregates, so changing the range is a
 * navigation. That keeps a chosen range shareable and bookmarkable, and means
 * the numbers are always the server's, never a stale client copy.
 */
export function RangePicker({
  current,
  fromDate,
  toDate,
}: {
  current: RangeKey;
  fromDate: string;
  toDate: string;
}) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);

  function go(next: URLSearchParams) {
    startTransition(() => router.push(`/dashboard/reports?${next.toString()}`));
  }

  function pick(key: RangeKey) {
    if (key === "custom") {
      applyCustom();
      return;
    }
    const next = new URLSearchParams(params);
    next.set("range", key);
    next.delete("from");
    next.delete("to");
    go(next);
  }

  function applyCustom() {
    const next = new URLSearchParams();
    next.set("range", "custom");
    next.set("from", from);
    next.set("to", to);
    go(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGE_KEYS.map((key) => (
          <Button
            key={key}
            variant={current === key ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() => pick(key)}
          >
            {isPending && current === key && (
              <Loader2 className="animate-spin" />
            )}
            {t.reports.ranges[key]}
          </Button>
        ))}
      </div>

      {current === "custom" && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyCustom();
          }}
        >
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{t.reports.from}</span>
            <Input
              type="date"
              className="w-40"
              dir="ltr"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">{t.reports.to}</span>
            <Input
              type="date"
              className="w-40"
              dir="ltr"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {t.reports.apply}
          </Button>
        </form>
      )}

      <p className={cn("text-muted-foreground text-xs", isPending && "opacity-60")}>
        {fromDate === toDate
          ? fromDate
          : `${fromDate} — ${toDate}`}
      </p>
    </div>
  );
}
