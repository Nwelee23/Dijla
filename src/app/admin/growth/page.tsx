import { LineChart } from "lucide-react";

import { GrowthMetrics } from "@/components/admin/growth-metrics";
import { requireAdmin } from "@/lib/admin";
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
  const [{ data: growthRows }, { data: churn }] = await Promise.all([
    supabase.rpc("admin_growth_metrics"),
    supabase.rpc("admin_churn_log"),
  ]);
  const growth = growthRows?.[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LineChart className="size-6" />
          {t.growth.title}
        </h1>
        <p className="text-muted-foreground text-sm">{t.growth.subtitle}</p>
      </div>

      {growth && <GrowthMetrics growth={growth} churn={churn ?? []} />}
    </div>
  );
}
