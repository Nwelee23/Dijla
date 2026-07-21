import { OrderBoard } from "@/components/orders/order-board";
import type { LiveOrder } from "@/lib/hooks/use-realtime-orders";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.meta.orders };
}

const SELECT =
  "id, order_number, status, table_id, total, created_at, type, order_items(id, order_id, name_snapshot, price_snapshot, quantity, notes), tables(table_number)";

export default async function OrdersPage() {
  const t = await getT();
  const supabase = await createClient();

  // Rendered on the server so the board is already populated on first paint —
  // staff opening the tablet at the start of service should not watch a spinner.
  const { data } = await supabase
    .from("orders")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  const initialOrders: LiveOrder[] = (data ?? []).map((row) => ({
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    table_id: row.table_id,
    total: row.total,
    created_at: row.created_at,
    type: row.type,
    items: row.order_items ?? [],
    tableNumber: row.tables?.table_number ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t.orders.title}</h1>
        <p className="text-muted-foreground text-sm">{t.orders.subtitle}</p>
      </div>

      <OrderBoard initialOrders={initialOrders} />
    </div>
  );
}
