"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type OrderRow = Pick<
  Tables<"orders">,
  "id" | "order_number" | "status" | "table_id" | "total" | "created_at" | "type"
>;

export type OrderItemRow = Pick<
  Tables<"order_items">,
  "id" | "order_id" | "name_snapshot" | "price_snapshot" | "quantity" | "notes"
>;

export type LiveOrder = OrderRow & {
  items: OrderItemRow[];
  tableNumber: string | null;
};

const SELECT =
  "id, order_number, status, table_id, total, created_at, type, order_items(id, order_id, name_snapshot, price_snapshot, quantity, notes), tables(table_number)";

type Fetched = OrderRow & {
  order_items: OrderItemRow[];
  tables: { table_number: string } | null;
};

function shape(row: Fetched): LiveOrder {
  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    table_id: row.table_id,
    total: row.total,
    created_at: row.created_at,
    type: row.type,
    items: row.order_items ?? [],
    tableNumber: row.tables?.table_number ?? null,
  };
}

/** Safety net for a dropped socket. Iraqi mobile data is not reliable. */
const REFETCH_INTERVAL_MS = 25_000;

/**
 * Live order board.
 *
 * Realtime is the fast path, but it is never the only path. A restaurant's
 * connection drops, the tab sleeps, the socket silently dies — and a kitchen
 * screen that quietly stops updating is worse than one that was never live,
 * because staff keep trusting it. So a full refetch also runs on an interval,
 * whenever the tab regains focus, and whenever the browser comes back online.
 * Realtime just makes it feel instant in between.
 */
export function useRealtimeOrders(initial: LiveOrder[]) {
  const [orders, setOrders] = useState<LiveOrder[]>(initial);
  const [isLive, setIsLive] = useState(false);

  // Orders whose arrival the operator has not acknowledged yet.
  const [unseen, setUnseen] = useState<Set<string>>(new Set());
  const onNewOrder = useRef<(() => void) | null>(null);
  const knownIds = useRef(new Set(initial.map((order) => order.id)));

  const refetch = useCallback(async () => {
    const supabase = createClient();
    // RLS scopes this to the signed-in restaurant.
    const { data, error } = await supabase
      .from("orders")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return;

    const next = (data as unknown as Fetched[]).map(shape);

    // Anything that appeared while the socket was down still counts as new, so
    // a reconnect surfaces the orders that were missed rather than hiding them.
    const arrived = next.filter((order) => !knownIds.current.has(order.id));
    if (arrived.length > 0) {
      setUnseen((current) => {
        const updated = new Set(current);
        for (const order of arrived) updated.add(order.id);
        return updated;
      });
      onNewOrder.current?.();
    }

    knownIds.current = new Set(next.map((order) => order.id));
    setOrders(next);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("dashboard-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        // The payload carries the order but not its items or table number, so
        // refetch rather than patch a half-populated card onto the board.
        () => void refetch()
      )
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    const interval = setInterval(refetch, REFETCH_INTERVAL_MS);
    const onFocus = () => void refetch();

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [refetch]);

  const acknowledge = useCallback((orderId: string) => {
    setUnseen((current) => {
      if (!current.has(orderId)) return current;
      const updated = new Set(current);
      updated.delete(orderId);
      return updated;
    });
  }, []);

  const acknowledgeAll = useCallback(() => setUnseen(new Set()), []);

  const setNewOrderHandler = useCallback((handler: (() => void) | null) => {
    onNewOrder.current = handler;
  }, []);

  return {
    orders,
    isLive,
    unseen,
    acknowledge,
    acknowledgeAll,
    refetch,
    setNewOrderHandler,
  };
}
