import { Banknote, CircleDot, Receipt, Store } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/utils";

export type PlatformStats = {
  total_restaurants: number;
  active_count: number;
  trial_count: number;
  past_due_count: number;
  cancelled_count: number;
  suspended_count: number;
  total_orders: number;
  mrr: number;
};

/**
 * The platform at a glance. MRR is the sum of active subscription amounts, so it
 * reads as zero until prices are recorded in the subscription editor — honest,
 * not broken: nobody is billed yet.
 */
export async function AdminStats({ stats }: { stats: PlatformStats }) {
  const t = await getT();
  const n = (v: number) => String(Number(v));

  const cards = [
    { icon: Store, label: t.admin.totalRestaurants, value: n(stats.total_restaurants) },
    { icon: Banknote, label: t.admin.mrr, value: formatMoney(Number(stats.mrr)) },
    { icon: Receipt, label: t.admin.totalOrders, value: n(stats.total_orders) },
    {
      icon: CircleDot,
      label: t.admin.suspendedCount,
      value: n(stats.suspended_count),
    },
  ];

  const breakdown = [
    { label: t.admin.statuses.active, value: n(stats.active_count), tone: "text-emerald-600" },
    { label: t.admin.statuses.trial, value: n(stats.trial_count), tone: "text-blue-600" },
    { label: t.admin.statuses.past_due, value: n(stats.past_due_count), tone: "text-amber-600" },
    { label: t.admin.statuses.cancelled, value: n(stats.cancelled_count), tone: "text-destructive" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <card.icon className="size-3.5" />
                {card.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">
          {breakdown.map((row) => (
            <span key={row.label} className="flex items-center gap-1.5">
              <span className={`font-bold tabular-nums ${row.tone}`}>{row.value}</span>
              <span className="text-muted-foreground">{row.label}</span>
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
