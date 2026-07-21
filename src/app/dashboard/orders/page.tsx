import { OrderBoard } from "@/components/orders/order-board";
import {
  ORDERS_SELECT,
  shapeOrder,
  type LiveOrder,
} from "@/lib/hooks/use-realtime-orders";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.orders };
}

export default async function OrdersPage() {
  const t = await getT();
  const supabase = await createClient();

  // Rendered on the server so the board is already populated on first paint —
  // staff opening the tablet at the start of service should not watch a spinner.
  const [{ data }, { data: calls }, { data: drivers }] = await Promise.all([
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

      <OrderBoard
        initialOrders={initialOrders}
        initialCalls={(calls ?? []).map((row) => ({
          id: row.id,
          tableNumber: row.tables?.table_number ?? null,
        }))}
        drivers={drivers ?? []}
      />
    </div>
  );
}
