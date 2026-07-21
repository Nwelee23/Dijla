import { Bike } from "lucide-react";

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
  // new drivers are added.
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, driver_status, is_active, created_at")
    .eq("role", "driver")
    .order("created_at", { ascending: true });

  const drivers = data ?? [];

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

      <DriverList drivers={drivers} />
    </div>
  );
}
