import type { Tables } from "@/lib/supabase/types";

/**
 * The shared order projection and its shaping.
 *
 * Deliberately NOT a "use client" module. Both the dashboard's server page (for
 * first paint) and the realtime hook (for live refetches) read the identical
 * shape, so it lives here where each can import it — a server component that
 * imported these from a "use client" file would receive client-reference
 * proxies instead of the real string and function, and the query builder would
 * fail on a select that is not a string. That is a runtime error the build does
 * not catch, so the boundary matters.
 */

export type OrderRow = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "status"
  | "table_id"
  | "subtotal"
  | "delivery_fee"
  | "total"
  | "created_at"
  | "type"
  | "customer_name"
  | "customer_phone"
  | "customer_landmark"
  | "customer_lat"
  | "customer_lng"
  | "delivery_notes"
  | "driver_id"
>;

export type OrderItemRow = Pick<
  Tables<"order_items">,
  "id" | "order_id" | "name_snapshot" | "price_snapshot" | "quantity" | "notes" | "options_snapshot"
>;

/** The shape stored in order_items.options_snapshot, for display. */
export type OrderItemOption = { name: string; price_delta: number };

/** Parse the jsonb options snapshot into a typed list, dropping anything malformed. */
export function orderItemOptions(snapshot: unknown): OrderItemOption[] {
  if (!Array.isArray(snapshot)) return [];
  const options: OrderItemOption[] = [];
  for (const entry of snapshot) {
    if (entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string") {
      const name = (entry as { name: string }).name;
      const delta = Number((entry as { price_delta?: unknown }).price_delta ?? 0);
      options.push({ name, price_delta: Number.isFinite(delta) ? delta : 0 });
    }
  }
  return options;
}

export type OrderDriver = {
  id: string;
  full_name: string | null;
  driver_status: string | null;
};

export type LiveOrder = OrderRow & {
  items: OrderItemRow[];
  tableNumber: string | null;
  /** The assigned driver, embedded through orders.driver_id. Null if unassigned. */
  driver: OrderDriver | null;
};

/** driver: embedded via the orders.driver_id -> profiles(id) foreign key. */
export const ORDERS_SELECT =
  "id, order_number, status, table_id, subtotal, delivery_fee, total, created_at, type, customer_name, customer_phone, customer_landmark, customer_lat, customer_lng, delivery_notes, driver_id, order_items(id, order_id, name_snapshot, price_snapshot, quantity, notes, options_snapshot), tables(table_number), driver:profiles!orders_driver_id_fkey(id, full_name, driver_status)";

export type FetchedOrder = OrderRow & {
  order_items: OrderItemRow[];
  tables: { table_number: string } | null;
  driver: OrderDriver | null;
};

export function shapeOrder(row: FetchedOrder): LiveOrder {
  const { order_items, tables, driver, ...order } = row;
  return {
    ...order,
    items: order_items ?? [],
    tableNumber: tables?.table_number ?? null,
    driver: driver ?? null,
  };
}
