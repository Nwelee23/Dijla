"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import {
  elapsedSeconds,
  formatElapsed,
  timerLevel,
  type PrepThresholds,
} from "@/lib/order-timing";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = {
  normal: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400 font-semibold",
  danger: "text-red-600 dark:text-red-400 font-bold",
} as const;

/**
 * The live elapsed timer (ORDERS_DASHBOARD_SPEC §3). Ticks every second and
 * turns warning then danger past the restaurant's thresholds. Its own tick, not
 * the board's data refresh, so it keeps counting between refetches.
 */
export function ElapsedTimer({
  createdAt,
  thresholds,
  className,
}: {
  createdAt: string | null;
  thresholds: PrepThresholds;
  className?: string;
}) {
  // Lazy initial value so the first paint is already right; the interval only
  // updates it afterwards, so no setState runs synchronously in the effect body.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = elapsedSeconds(createdAt, now);
  const level = timerLevel(seconds, thresholds);

  return (
    <span
      className={cn("flex items-center gap-1 tabular-nums", LEVEL_CLASS[level], className)}
      dir="ltr"
      role="timer"
      aria-label={formatElapsed(seconds)}
    >
      <Clock className="size-3.5" />
      {formatElapsed(seconds)}
    </span>
  );
}
