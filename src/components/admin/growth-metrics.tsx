import { Activity, DoorOpen, LineChart, Rocket, Store, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

export type Growth = {
  total_restaurants: number;
  active_7d: number;
  active_30d: number;
  signups_30d: number;
  activated: number;
  orders_7d: number;
  paying: number;
  trialing: number;
  cancelled: number;
  mrr: number;
  arpu: number;
};

export type ChurnRow = {
  restaurant_id: string;
  name: string;
  end_date: string | null;
  reason: string | null;
};

/** A whole number, or a percentage of a base (0 when the base is 0). */
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * The founder's dashboard: engagement and retention at a glance.
 *
 * Every figure here is derived from real data. CAC and payback are not shown —
 * they need spend the app never sees, and a fake zero would be worse than an
 * honest gap. Retention is the raw paying-versus-churned split, not a cohort
 * rate, because the single-row subscription model does not keep renewal history
 * to compute one truthfully.
 */
export async function GrowthMetrics({
  growth,
  churn,
}: {
  growth: Growth;
  churn: ChurnRow[];
}) {
  const t = await getT();
  const num = (v: number) => String(Number(v));

  const cards = [
    { icon: Activity, label: t.growth.active7d, value: num(growth.active_7d), sub: interpolate(t.growth.ofTotal, { total: Number(growth.total_restaurants) }) },
    { icon: Activity, label: t.growth.active30d, value: num(growth.active_30d), sub: "" },
    { icon: Rocket, label: t.growth.activation, value: `${pct(Number(growth.activated), Number(growth.total_restaurants))}%`, sub: interpolate(t.growth.activatedOf, { activated: Number(growth.activated), total: Number(growth.total_restaurants) }) },
    { icon: LineChart, label: t.growth.ordersPerActive, value: growth.active_7d > 0 ? (Number(growth.orders_7d) / Number(growth.active_7d)).toFixed(1) : "0", sub: t.growth.perWeek },
    { icon: TrendingUp, label: t.growth.mrr, value: formatMoney(Number(growth.mrr)), sub: "" },
    { icon: Store, label: t.growth.arpu, value: formatMoney(Number(growth.arpu)), sub: t.growth.perPaying },
    { icon: Store, label: t.growth.signups30d, value: num(growth.signups_30d), sub: "" },
    { icon: DoorOpen, label: t.growth.churned, value: num(growth.cancelled), sub: interpolate(t.growth.vsPaying, { paying: Number(growth.paying) }) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <card.icon className="size-3.5" />
                {card.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{card.value}</p>
              {card.sub && (
                <p className="text-muted-foreground text-xs">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="size-4" />
            {t.growth.churnLog}
          </CardTitle>
          <CardDescription>{t.growth.churnHint}</CardDescription>
        </CardHeader>
        <CardContent>
          {churn.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t.growth.noChurn}
            </p>
          ) : (
            <ul className="divide-y">
              {churn.map((row) => (
                <li key={row.restaurant_id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {row.reason || t.growth.noReason}
                    </p>
                  </div>
                  {row.end_date && (
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {row.end_date}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">{t.growth.externalNote}</p>
    </div>
  );
}
