import { GettingStarted } from "@/components/dashboard/getting-started";
import { OrderBoard } from "@/components/orders/order-board";
import {
  ORDERS_SELECT,
  shapeOrder,
  type LiveOrder,
} from "@/lib/orders-select";
import { getRestaurant } from "@/lib/restaurant";
import { getT } from "@/lib/i18n/server";
import { readPrepThresholds } from "@/lib/order-timing";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.orders };
}

export default async function OrdersPage() {
  const [t, restaurant, supabase] = await Promise.all([
    getT(),
    getRestaurant(),
    createClient(),
  ]);

  // Rendered on the server so the board is already populated on first paint —
  // staff opening the tablet at the start of service should not watch a spinner.
  // The two head:true counts feed the getting-started checklist and pull no rows.
  const [{ data }, { data: calls }, { data: drivers }, { count: menuCount }, { count: tableCount }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(ORDERS_SELECT)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("waiter_calls")
        .select("id, tables(table_number)")
        .eq("acknowledged", false)
        .order("created_at", { ascending: true }),
      // The roster the assign control offers. RLS gives staff their own
      // restaurant's profiles; the filter narrows to active drivers.
      supabase
        .from("profiles")
        .select("id, full_name, driver_status")
        .eq("role", "driver")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase.from("menu_items").select("id", { count: "exact", head: true }),
      supabase.from("tables").select("id", { count: "exact", head: true }),
    ]);

  const initialOrders: LiveOrder[] = (
    data as Parameters<typeof shapeOrder>[0][] | null ?? []
  ).map(shapeOrder);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t.orders.title}</h1>
        <p className="text-muted-foreground text-sm">{t.orders.subtitle}</p>
      </div>

      <GettingStarted
        hasMenu={(menuCount ?? 0) > 0}
        hasTables={(tableCount ?? 0) > 0}
        hasOrders={initialOrders.length > 0}
        slug={restaurant?.slug ?? ""}
      />

      <OrderBoard
        initialOrders={initialOrders}
        initialCalls={(calls ?? []).map((row) => ({
          id: row.id,
          tableNumber: row.tables?.table_number ?? null,
        }))}
        drivers={drivers ?? []}
        thresholds={readPrepThresholds(restaurant?.settings)}
      />
    </div>
  );
}
