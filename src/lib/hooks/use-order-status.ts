"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type OrderStatusView = {
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string | null;
};

/**
 * Slow enough to be kind to a phone on mobile data, fast enough that "ready"
 * reaches the table while the food is still hot.
 */
const POLL_INTERVAL_MS = 6_000;

/** Nothing changes after these, so stop asking. */
const TERMINAL = new Set(["delivered", "cancelled"]);

function parse(payload: unknown): OrderStatusView | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = payload as Record<string, unknown>;

  const status = typeof raw.status === "string" ? raw.status : null;
  const orderNumber =
    typeof raw.orderNumber === "number" ? raw.orderNumber : null;
  if (!status || orderNumber === null) return null;

  return {
    orderNumber,
    status,
    total: Number(raw.total ?? 0),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
  };
}

/**
 * Live-ish status for the diner's own order.
 *
 * Polled, not subscribed — see 0008_order_status_lookup.sql for why an
 * anonymous Realtime subscription is not on the table. Polling also degrades
 * better here: on a connection that keeps dropping, a socket that silently dies
 * shows a stale status forever, while the next poll simply succeeds.
 */
export function useOrderStatus(orderId: string | null) {
  const [state, setState] = useState<OrderStatusView | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!orderId) return null;

    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_order_status", {
      p_order_id: orderId,
    });

    if (error) return null;

    const parsed = parse(data);
    if (parsed) setState(parsed);
    return parsed;
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const result = await fetchStatus();
      if (cancelled) return;
      // Chain the next poll off the response rather than a fixed interval, so a
      // slow request never stacks another on top of it.
      if (!result || !TERMINAL.has(result.status)) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    void tick();

    // Coming back to the tab should feel instant, not wait out the interval.
    const onFocus = () => void fetchStatus();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [orderId, fetchStatus]);

  return state;
}
