import { BarChart3, Banknote, Clock, Receipt, TrendingUp } from "lucide-react";

import { RangePicker } from "@/components/reports/range-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRestaurant } from "@/lib/restaurant";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { resolveRange } from "@/lib/report-range";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.reports.title} | ${t.brand.name}` };
}

const ORDER_TYPES = ["dine_in", "delivery", "pickup"] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const [{ range, from, to }, t, restaurant, supabase] = await Promise.all([
    searchParams,
    getT(),
    getRestaurant(),
    createClient(),
  ]);

  const window_ = resolveRange(range, from, to);
  const rid = restaurant!.id;
  const args = { rid, from_ts: window_.from, to_ts: window_.to };

  // Every figure is a server-side aggregate — no order rows cross to the
  // browser. Fired together so the page waits on one round trip, not four.
  const [summaryRes, byTypeRes, topRes, hourlyRes] = await Promise.all([
    supabase.rpc("restaurant_sales_summary", args),
    supabase.rpc("restaurant_sales_by_type", args),
    supabase.rpc("restaurant_top_items", { ...args, lim: 10 }),
    supabase.rpc("restaurant_hourly", args),
  ]);

  const summary = summaryRes.data?.[0] ?? {
    order_count: 0,
    revenue: 0,
    avg_order: 0,
    cash_collected: 0,
  };
  const byType = byTypeRes.data ?? [];
  const topItems = topRes.data ?? [];
  const hourly = hourlyRes.data ?? [];

  const currency = restaurant!.currency ?? "IQD";
  const money = (value: number) => formatMoney(Number(value), currency);

  const typeRevenue = (type: string) =>
    Number(byType.find((row) => row.type === type)?.revenue ?? 0);
  const typeCount = (type: string) =>
    Number(byType.find((row) => row.type === type)?.order_count ?? 0);
  const maxTypeRevenue = Math.max(1, ...ORDER_TYPES.map(typeRevenue));

  const maxHour = Math.max(1, ...hourly.map((h) => Number(h.order_count)));

  const stats = [
    { icon: TrendingUp, label: t.reports.revenue, value: money(summary.revenue) },
    {
      icon: Receipt,
      label: t.reports.orderCount,
      value: String(Number(summary.order_count)),
    },
    { icon: BarChart3, label: t.reports.avgOrder, value: money(summary.avg_order) },
    {
      icon: Banknote,
      label: t.reports.cashCollected,
      value: money(summary.cash_collected),
    },
  ];

  const empty = Number(summary.order_count) === 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="size-6" />
          {t.reports.title}
        </h1>
        <p className="text-muted-foreground text-sm">{t.reports.subtitle}</p>
      </div>

      <RangePicker
        current={window_.key}
        fromDate={window_.fromDate}
        toDate={window_.toDate}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <stat.icon className="size-3.5" />
                {stat.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {empty ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center">
            {t.reports.noData}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.reports.byType}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ORDER_TYPES.map((type) => (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t.reports.types[type]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {interpolate(t.reports.ordersN, { count: typeCount(type) })} ·{" "}
                      {money(typeRevenue(type))}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{
                        width: `${(typeRevenue(type) / maxTypeRevenue) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.reports.topItems}</CardTitle>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.reports.noData}</p>
              ) : (
                <ol className="space-y-2">
                  {topItems.map((item, index) => (
                    <li key={item.name} className="flex items-center gap-3">
                      <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                        {interpolate(t.reports.soldN, {
                          count: Number(item.quantity),
                        })}
                      </span>
                      <span className="w-24 shrink-0 text-end font-medium tabular-nums">
                        {money(item.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" />
                {t.reports.busiestHours}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hourly.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t.reports.noData}</p>
              ) : (
                <div className="flex items-end gap-1" style={{ height: "8rem" }}>
                  {hourly.map((row) => (
                    <div
                      key={row.hour}
                      className="flex flex-1 flex-col items-center justify-end gap-1"
                      title={interpolate(t.reports.ordersN, {
                        count: Number(row.order_count),
                      })}
                    >
                      <div
                        className="bg-primary/80 w-full rounded-t"
                        style={{
                          height: `${(Number(row.order_count) / maxHour) * 100}%`,
                          minHeight: "2px",
                        }}
                      />
                      <span className="text-muted-foreground text-[10px] tabular-nums">
                        {String(row.hour).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
