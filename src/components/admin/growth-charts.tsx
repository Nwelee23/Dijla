"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MonthPoint } from "@/lib/admin-charts";
import { percentChange } from "@/lib/report-insights";
import { cn, formatMoney } from "@/lib/utils";

/**
 * Admin growth charts (UX_IMPROVEMENTS_SPEC §A.1, §A.2): new restaurants per
 * month (with a cumulative toggle) and the MRR curve with its current value and
 * month-over-month change. Inline SVG, single brand colour, theme-aware via
 * tokens — no chart library.
 */
export function GrowthCharts({
  newMonthly,
  cumulativeMonthly,
  mrr,
  currency,
}: {
  newMonthly: MonthPoint[];
  cumulativeMonthly: MonthPoint[];
  mrr: MonthPoint[];
  currency: string;
}) {
  const t = useT();
  const [cumulative, setCumulative] = useState(false);

  const bars = cumulative ? cumulativeMonthly : newMonthly;
  const barMax = Math.max(1, ...bars.map((p) => p.value));
  const width = Math.max(1, bars.length) * 20;

  const mrrMax = Math.max(1, ...mrr.map((p) => p.value));
  const current = mrr[mrr.length - 1]?.value ?? 0;
  const previous = mrr[mrr.length - 2]?.value ?? 0;
  const change = percentChange(current, previous);
  const mrrWidth = Math.max(1, mrr.length) * 20;
  const step = mrr.length > 1 ? mrrWidth / (mrr.length - 1) : mrrWidth;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{t.growth.newRestaurants}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCumulative((value) => !value)}
          >
            {cumulative ? t.growth.showNew : t.growth.showCumulative}
          </Button>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={`0 0 ${width} 120`}
            className="h-auto w-full"
            role="img"
            aria-label={t.growth.newRestaurants}
          >
            {bars.map((point, index) => {
              const height = (point.value / barMax) * 90;
              return (
                <g key={point.month}>
                  <rect
                    x={index * 20 + 3}
                    y={100 - height}
                    width={14}
                    height={height}
                    rx={2}
                    className="fill-brand"
                  />
                  <text
                    x={index * 20 + 10}
                    y={114}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[7px]"
                  >
                    {point.month.slice(5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t.growth.mrr}</CardTitle>
          <p className="flex items-center gap-2 text-2xl font-bold tabular-nums">
            {formatMoney(current, currency)}
            {change && change.dir !== "flat" && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  change.dir === "up" ? "text-brand" : "text-muted-foreground"
                )}
              >
                {change.dir === "up" ? (
                  <ArrowUp className="size-3.5" />
                ) : (
                  <ArrowDown className="size-3.5" />
                )}
                {change.pct}٪
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={`0 0 ${mrrWidth} 100`}
            className="h-auto w-full"
            role="img"
            aria-label={t.growth.mrr}
          >
            <polyline
              points={mrr
                .map(
                  (point, index) =>
                    `${index * step},${100 - (point.value / mrrMax) * 88 - 6}`
                )
                .join(" ")}
              className="stroke-brand fill-none"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </CardContent>
      </Card>
    </div>
  );
}
