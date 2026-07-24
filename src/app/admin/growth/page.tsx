import { LineChart } from "lucide-react";

import { CohortRetention } from "@/components/admin/cohort-retention";
import { GrowthCharts } from "@/components/admin/growth-charts";
import { GrowthMetrics } from "@/components/admin/growth-metrics";
import { requireAdmin } from "@/lib/admin";
import {
  cumulativeRestaurantsPerMonth,
  mrrPerMonth,
  newRestaurantsPerMonth,
  type AdminChartRow,
} from "@/lib/admin-charts";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.growth.title} | ${t.brand.name}` };
}

export default async function GrowthPage() {
  const [t, supabase] = await Promise.all([getT(), createClient()]);

  // Both RPCs are gated by is_platform_admin() in SQL; requireAdmin() is the
  // layout's job, and empty results render an empty dashboard rather than leak.
  await requireAdmin();
  const [
    { data: growthRows },
    { data: churn },
    { data: adminRestaurants },
    { data: cohorts },
  ] = await Promise.all([
    supabase.rpc("admin_growth_metrics"),
    supabase.rpc("admin_churn_log"),
    supabase.rpc("admin_restaurants"),
    supabase.rpc("admin_cohort_retention"),
  ]);
  const growth = growthRows?.[0] ?? null;

  // Monthly series derived from the restaurant list — no extra RPC (§A.1, §A.2).
  const chartRows: AdminChartRow[] = (adminRestaurants ?? []).map((r) => ({
    created_at: r.created_at,
    start_date: r.start_date,
    end_date: r.end_date,
    amount: r.amount,
    status: r.status,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LineChart className="size-6" />
          {t.growth.title}
        </h1>
        <p className="text-muted-foreground text-sm">{t.growth.subtitle}</p>
      </div>

      {chartRows.length > 0 && (
        <GrowthCharts
          newMonthly={newRestaurantsPerMonth(chartRows)}
          cumulativeMonthly={cumulativeRestaurantsPerMonth(chartRows)}
          mrr={mrrPerMonth(chartRows)}
          currency="IQD"
        />
      )}

      <CohortRetention rows={cohorts ?? []} />

      {growth && <GrowthMetrics growth={growth} churn={churn ?? []} />}
    </div>
  );
}
