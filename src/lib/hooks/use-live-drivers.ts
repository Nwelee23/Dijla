"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { OrderDriver } from "@/lib/hooks/use-realtime-orders";

/**
 * The restaurant's driver roster, kept fresh for the assign control.
 *
 * Polled rather than subscribed. profiles is not in the realtime publication —
 * adding it would mean a migration and a per-subscriber RLS cost — and the
 * roster is not on the critical path: a driver's availability only decides who
 * the assign dropdown offers, and being a few seconds stale there is harmless,
 * where an order's own status is live through the orders subscription already.
 *
 * The assigned driver's status is never stale regardless: it rides along on the
 * order row, which the board refetches on every realtime change.
 */
const POLL_INTERVAL_MS = 15_000;

export function useLiveDrivers(initial: OrderDriver[]) {
  const [drivers, setDrivers] = useState<OrderDriver[]>(initial);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    // RLS scopes profiles to this restaurant's staff view; the filter narrows
    // it to active drivers, matching what the server first rendered.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, driver_status")
      .eq("role", "driver")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (!error && data) setDrivers(data);
  }, []);

  useEffect(() => {
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    const onFocus = () => void refetch();

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [refetch]);

  return drivers;
}
