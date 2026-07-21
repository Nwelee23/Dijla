import { DriverHeader } from "@/components/driver/driver-header";
import { DriverOrderList } from "@/components/driver/driver-order-list";
import { getProfile } from "@/lib/auth/user";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { DriverOrder } from "@/lib/hooks/use-driver-orders";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t.driverApp.title} | ${t.brand.name}` };
}

// Kept in step with DRIVER_SELECT in use-driver-orders, so the server's first
// paint and the client's live refetch read the same shape.
const DRIVER_SELECT =
  "id, order_number, status, customer_name, customer_phone, customer_landmark, customer_lat, customer_lng, delivery_notes, subtotal, delivery_fee, total, payment_status, cash_collected, created_at, order_items(id, name_snapshot, price_snapshot, quantity, notes)";

export default async function DriverHomePage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  // Both scoped by RLS to this driver: the restaurant is their own row, the
  // orders are only those assigned to them.
  const [{ data: restaurant }, { data: orders }] = await Promise.all([
    supabase.from("restaurants").select("name").maybeSingle(),
    supabase
      .from("orders")
      .select(DRIVER_SELECT)
      .in("status", ["ready", "out_for_delivery"]),
  ]);

  const initial: DriverOrder[] = (orders ?? []).map((row) => {
    const { order_items, ...order } = row;
    return { ...order, items: order_items ?? [] };
  });

  return (
    <>
      <DriverHeader
        driverName={profile?.full_name ?? ""}
        restaurantName={restaurant?.name ?? ""}
        status={profile?.driver_status ?? "offline"}
      />

      <main className="mx-auto w-full max-w-md flex-1 p-4">
        <DriverOrderList initial={initial} />
      </main>
    </>
  );
}
