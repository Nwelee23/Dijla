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

/** Midnight today in Baghdad (UTC+3, no DST), as an ISO instant. */
function baghdadDayStartISO(): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${today}T00:00:00+03:00`;
}

export default async function DriverHomePage() {
  const [profile, supabase] = await Promise.all([getProfile(), createClient()]);

  // All scoped by RLS to this driver: the restaurant is their own row, the
  // active orders are only those assigned to them, and the delivered-today set
  // (for "cash in hand") is likewise their own.
  const [{ data: restaurant }, { data: orders }, { data: doneToday }] = await Promise.all([
    supabase.from("restaurants").select("name").maybeSingle(),
    supabase
      .from("orders")
      .select(DRIVER_SELECT)
      .in("status", ["ready", "out_for_delivery"]),
    supabase
      .from("orders")
      .select("cash_collected")
      .eq("driver_id", profile?.id ?? "")
      .eq("status", "delivered")
      .gte("updated_at", baghdadDayStartISO()),
  ]);

  const initial: DriverOrder[] = (orders ?? []).map((row) => {
    const { order_items, ...order } = row;
    return { ...order, items: order_items ?? [] };
  });

  // The cash rule (§A.5): the running total the driver hands over at end of
  // shift, kept in the persistent header so it is on every screen.
  const cashInHand = (doneToday ?? []).reduce(
    (sum, o) => sum + Number(o.cash_collected ?? 0),
    0
  );
  const deliveredToday = (doneToday ?? []).length;

  return (
    <>
      <DriverHeader
        driverName={profile?.full_name ?? ""}
        restaurantName={restaurant?.name ?? ""}
        status={profile?.driver_status ?? "offline"}
        cashInHand={cashInHand}
        deliveredToday={deliveredToday}
      />

      <main className="mx-auto w-full max-w-md flex-1 p-4">
        <DriverOrderList initial={initial} />
      </main>
    </>
  );
}
