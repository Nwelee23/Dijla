import { Bike } from "lucide-react";

import {
  CashReconciliation,
  type ReconciliationRow,
} from "@/components/drivers/cash-reconciliation";
import { DriverList } from "@/components/drivers/driver-list";
import { getRestaurant } from "@/lib/restaurant";
import { getT } from "@/lib/i18n/server";
import { baghdadDayBounds, safeDate } from "@/lib/report-range";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.drivers.title} | ${t.brand.name}` };
}

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ date }, t, restaurant, supabase] = await Promise.all([
    searchParams,
    getT(),
    getRestaurant(),
    createClient(),
  ]);

  const day = safeDate(date);
  const { start, end } = baghdadDayBounds(day);

  // RLS (post-0011) scopes profiles to this restaurant's staff view; the filter
  // narrows it to drivers. The reconciliation RPC (0016) scopes itself to this
  // restaurant and staff, and covers the chosen Baghdad day.
  const [{ data }, { data: cash }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, driver_status, is_active, created_at")
      .eq("role", "driver")
      .order("created_at", { ascending: true }),
    supabase.rpc("driver_cash_reconciliation", {
      rid: restaurant!.id,
      day_start: start,
      day_end: end,
    }),
  ]);

  const drivers = data ?? [];
  // Null when 0016 has not been applied yet — the card simply does not render,
  // and the roster below is unaffected.
  const rows: ReconciliationRow[] | null = cash ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bike className="size-6" />
            {t.drivers.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.drivers.subtitle}</p>
        </div>
      </div>

      {rows && (
        <CashReconciliation
          rows={rows}
          date={day}
          restaurantName={restaurant!.name}
          currency={restaurant!.currency ?? "IQD"}
        />
      )}

      <div className="print:hidden">
        <DriverList drivers={drivers} />
      </div>
    </div>
  );
}
