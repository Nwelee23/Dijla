import { Inbox } from "lucide-react";

import { DriverHeader } from "@/components/driver/driver-header";
import { getProfile } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.driverApp.title} | ${t.brand.name}` };
}

export default async function DriverHomePage() {
  const [t, profile, supabase] = await Promise.all([
    getT(),
    getProfile(),
    createClient(),
  ]);

  // The restaurant this driver belongs to, for the header. RLS gives a driver a
  // read-only view of their own restaurant row (0011), nothing more.
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name")
    .maybeSingle();

  return (
    <>
      <DriverHeader
        driverName={profile?.full_name ?? ""}
        restaurantName={restaurant?.name ?? ""}
        status={profile?.driver_status ?? "offline"}
      />

      <main className="mx-auto w-full max-w-md flex-1 p-4">
        {/* The live assigned-deliveries list is built in 4.4. Until then this
            is an honest empty state, not a dead screen: a signed-in driver sees
            who they are and that nothing is waiting. */}
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <Inbox className="size-10 opacity-40" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">{t.driverApp.noDeliveries}</p>
            <p className="text-sm">{t.driverApp.noDeliveriesHint}</p>
          </div>
        </div>
      </main>
    </>
  );
}
