import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Banknote,
  Clock,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { ExportCsvButton } from "@/components/reports/export-csv-button";
import { RangePicker } from "@/components/reports/range-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { itemProfit } from "@/lib/report-profit";
import { getRestaurant } from "@/lib/restaurant";
import { getT } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n";
import { resolveRange } from "@/lib/report-range";
import {
  percentChange,
  selectInsights,
  type Insight,
} from "@/lib/report-insights";
import { createClient } from "@/lib/supabase/server";
import { cn, formatMoney } from "@/lib/utils";

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

  // The equivalent window immediately before, for the period comparison (§B.1).
  const spanMs =
    new Date(window_.to).getTime() - new Date(window_.from).getTime();
  const prevArgs = {
    rid,
    from_ts: new Date(new Date(window_.from).getTime() - spanMs).toISOString(),
    to_ts: window_.from,
  };

  // Every figure is a server-side aggregate — no order rows cross to the
  // browser. Fired together so the page waits on one round trip, not five.
  const [summaryRes, byTypeRes, topRes, hourlyRes, prevRes, costRes] =
    await Promise.all([
      supabase.rpc("restaurant_sales_summary", args),
      supabase.rpc("restaurant_sales_by_type", args),
      supabase.rpc("restaurant_top_items", { ...args, lim: 10 }),
      supabase.rpc("restaurant_hourly", args),
      supabase.rpc("restaurant_sales_summary", prevArgs),
      // Costs stay in the dashboard (RLS-scoped); never on a customer surface.
      supabase.from("menu_items").select("name, cost"),
    ]);

  const summary = summaryRes.data?.[0] ?? {
    order_count: 0,
    revenue: 0,
    avg_order: 0,
    cash_collected: 0,
  };
  const prev = prevRes.data?.[0] ?? {
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
  const maxTopRevenue = Math.max(
    1,
    ...topItems.map((item) => Number(item.revenue))
  );

  const stats = [
    {
      icon: TrendingUp,
      label: t.reports.revenue,
      value: money(summary.revenue),
      change: percentChange(Number(summary.revenue), Number(prev.revenue)),
    },
    {
      icon: Receipt,
      label: t.reports.orderCount,
      value: String(Number(summary.order_count)),
      change: percentChange(
        Number(summary.order_count),
        Number(prev.order_count)
      ),
    },
    {
      icon: BarChart3,
      label: t.reports.avgOrder,
      value: money(summary.avg_order),
      change: percentChange(Number(summary.avg_order), Number(prev.avg_order)),
    },
    {
      icon: Banknote,
      label: t.reports.cashCollected,
      value: money(summary.cash_collected),
      change: percentChange(
        Number(summary.cash_collected),
        Number(prev.cash_collected)
      ),
    },
  ];

  const insights = selectInsights({
    totalOrders: Number(summary.order_count),
    prevOrders: Number(prev.order_count),
    hourly: hourly.map((h) => ({
      hour: Number(h.hour),
      count: Number(h.order_count),
    })),
    topItem: topItems[0]
      ? { name: topItems[0].name, count: Number(topItems[0].quantity) }
      : null,
    deliveryCount: typeCount("delivery"),
  });

  const insightText = (insight: Insight): string => {
    switch (insight.kind) {
      case "peak":
        return interpolate(t.reports.insights.peak, {
          start: insight.start,
          end: insight.end,
          pct: insight.pct,
        });
      case "topItem":
        return interpolate(t.reports.insights.topItem, {
          name: insight.name,
          count: insight.count,
        });
      case "orderUp":
        return interpolate(t.reports.insights.orderUp, { pct: insight.pct });
      case "orderDown":
        return interpolate(t.reports.insights.orderDown, { pct: insight.pct });
      case "deliveryShare":
        return interpolate(t.reports.insights.deliveryShare, {
          pct: insight.pct,
        });
    }
  };

  // Item profit (§B.5): join sold-item totals to costs by name, rank by profit.
  const costByName = new Map<string, number>();
  for (const row of costRes.data ?? []) {
    if (row.cost != null) costByName.set(row.name, Number(row.cost));
  }
  const profit = itemProfit(
    topItems.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      revenue: Number(item.revenue),
    })),
    costByName
  );

  const csvRows = topItems.map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    revenue: Number(item.revenue),
  }));

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <RangePicker
          current={window_.key}
          fromDate={window_.fromDate}
          toDate={window_.toDate}
        />
        {!empty && (
          <ExportCsvButton
            rows={csvRows}
            filename={`dijla-report-${window_.key}.csv`}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-1 p-4">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <stat.icon className="size-3.5" />
                {stat.label}
              </p>
              <p className="text-xl font-bold tabular-nums">{stat.value}</p>
              {stat.change && stat.change.dir !== "flat" && (
                <p
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    stat.change.dir === "up" ? "text-brand" : "text-muted-foreground"
                  )}
                >
                  {stat.change.dir === "up" ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                  {stat.change.pct}٪
                </p>
              )}
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
        <div className="space-y-6">
          {insights.length > 0 && (
            <Card>
              <CardContent className="space-y-1.5 p-4">
                {insights.map((insight, index) => (
                  <p key={index} className="flex items-center gap-2 text-sm">
                    <Sparkles className="text-brand size-3.5 shrink-0" />
                    {insightText(insight)}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

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
                    <li key={item.name} className="space-y-1">
                      <div className="flex items-center gap-3">
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
                      </div>
                      <div className="bg-muted ms-9 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-brand h-full rounded-full"
                          style={{
                            width: `${(Number(item.revenue) / maxTopRevenue) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {topItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.reports.profitTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                {profit.rows.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t.reports.profitEmpty}
                  </p>
                ) : (
                  <>
                    <ol className="space-y-2">
                      {profit.rows.map((row, index) => (
                        <li key={row.name} className="flex items-center gap-3 text-sm">
                          <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{row.name}</span>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {interpolate(t.reports.marginN, { pct: row.margin })}
                          </span>
                          <span className="text-brand w-24 shrink-0 text-end font-medium tabular-nums">
                            {money(row.profit)}
                          </span>
                        </li>
                      ))}
                    </ol>
                    {profit.missing > 0 && (
                      <p className="text-muted-foreground mt-3 text-xs">
                        {interpolate(t.reports.profitMissing, {
                          count: profit.missing,
                        })}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

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
        </div>
      )}
    </div>
  );
}
