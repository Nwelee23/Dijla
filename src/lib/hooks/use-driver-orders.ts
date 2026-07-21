"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

export type DriverOrderItem = Pick<
  Tables<"order_items">,
  "id" | "name_snapshot" | "price_snapshot" | "quantity" | "notes"
>;

export type DriverOrder = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "status"
  | "customer_name"
  | "customer_phone"
  | "customer_landmark"
  | "customer_lat"
  | "customer_lng"
  | "delivery_notes"
  | "subtotal"
  | "delivery_fee"
  | "total"
  | "payment_status"
  | "cash_collected"
  | "created_at"
> & { items: DriverOrderItem[] };

/**
 * A driver only ever carries a couple of runs at once, so no RLS filter is
 * written here — driver_orders_read already narrows `orders` to driver_id =
 * auth.uid(). The status filter keeps the list to what is actually in the
 * driver's hands: ready to collect, or already out.
 */
const DRIVER_SELECT =
  "id, order_number, status, customer_name, customer_phone, customer_landmark, customer_lat, customer_lng, delivery_notes, subtotal, delivery_fee, total, payment_status, cash_collected, created_at, order_items(id, name_snapshot, price_snapshot, quantity, notes)";

/** What a driver still has to do something about. Delivered ones drop off. */
const ACTIVE = ["ready", "out_for_delivery"] as const;

type Fetched = Omit<DriverOrder, "items"> & { order_items: DriverOrderItem[] };

function shape(row: Fetched): DriverOrder {
  const { order_items, ...order } = row;
  return { ...order, items: order_items ?? [] };
}

/**
 * out_for_delivery before ready: the run already in the driver's hands sits at
 * the top, and within each group the one waiting longest comes first. One job
 * at a time, oldest first.
 */
function sortForDriver(orders: DriverOrder[]): DriverOrder[] {
  const rank = (status: string) => (status === "out_for_delivery" ? 0 : 1);
  return [...orders].sort((a, b) => {
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

/** A dropped socket on mobile data is the norm, not the exception. */
const REFETCH_INTERVAL_MS = 20_000;

export function useDriverOrders(initial: DriverOrder[]) {
  const [orders, setOrders] = useState<DriverOrder[]>(sortForDriver(initial));
  const [isLive, setIsLive] = useState(false);

  const onNewOrder = useRef<(() => void) | null>(null);
  const knownIds = useRef(new Set(initial.map((order) => order.id)));

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(DRIVER_SELECT)
      .in("status", ACTIVE as unknown as string[]);

    if (error || !data) return;

    const next = sortForDriver((data as unknown as Fetched[]).map(shape));

    // A run that appeared while the socket was down is still new to the driver;
    // announce it on reconnect rather than let it slip in silently.
    const arrived = next.some((order) => !knownIds.current.has(order.id));
    knownIds.current = new Set(next.map((order) => order.id));
    setOrders(next);
    if (arrived) onNewOrder.current?.();
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("driver-orders")
      .on(
        "postgres_changes",
        // RLS delivers only this driver's rows; refetch to pull the items too.
        { event: "*", schema: "public", table: "orders" },
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

  const setNewOrderHandler = useCallback((handler: (() => void) | null) => {
    onNewOrder.current = handler;
  }, []);

  return { orders, isLive, refetch, setNewOrderHandler };
}
