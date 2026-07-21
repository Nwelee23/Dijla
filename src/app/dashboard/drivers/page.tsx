import { Bike } from "lucide-react";

import { CashToday, type DriverCash } from "@/components/drivers/cash-today";
import { DriverList } from "@/components/drivers/driver-list";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.drivers.title} | ${t.brand.name}` };
}

export default async function DriversPage() {
  const [t, supabase] = await Promise.all([getT(), createClient()]);

  // RLS (post-0011) scopes profiles to this restaurant's staff view; the filter
  // narrows it to drivers. Ordered oldest-first so the roster stays stable as
  // new drivers are added. The cash reconciliation comes from the 0013 RPC,
  // which scopes itself to this restaurant and staff.
  const [{ data }, { data: cash }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, driver_status, is_active, created_at")
      .eq("role", "driver")
      .order("created_at", { ascending: true }),
    supabase.rpc("driver_cash_today"),
  ]);

  const drivers = data ?? [];
  // Null when 0013 has not been applied yet — the card simply does not render,
  // and the roster below is unaffected.
  const cashToday: DriverCash[] | null = cash ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bike className="size-6" />
            {t.drivers.title}
          </h1>
          <p className="text-muted-foreground text-sm">{t.drivers.subtitle}</p>
        </div>
      </div>

      {cashToday && cashToday.length > 0 && <CashToday rows={cashToday} />}

      <DriverList drivers={drivers} />
    </div>
  );
}
