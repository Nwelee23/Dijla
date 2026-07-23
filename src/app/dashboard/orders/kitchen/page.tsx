import { KitchenBoard } from "@/components/orders/kitchen-board";
import { getT } from "@/lib/i18n/server";
import { ORDERS_SELECT, shapeOrder, type LiveOrder } from "@/lib/orders-select";
import { readPrepThresholds } from "@/lib/order-timing";
import { getRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.orders.kitchenTitle };
}

export default async function KitchenPage() {
  const [restaurant, supabase] = await Promise.all([getRestaurant(), createClient()]);

  // Server-rendered so a mounted tablet shows the current orders on first paint.
  const { data } = await supabase
    .from("orders")
    .select(ORDERS_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  const initialOrders: LiveOrder[] = (
    (data as Parameters<typeof shapeOrder>[0][] | null) ?? []
  ).map(shapeOrder);

  return (
    <KitchenBoard
      initialOrders={initialOrders}
      thresholds={readPrepThresholds(restaurant?.settings)}
    />
  );
}
