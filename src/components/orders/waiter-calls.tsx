"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { interpolate } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export type Call = { id: string; tableNumber: string | null };

const REFRESH_MS = 15_000;

/**
 * Tables waiting for someone to come over.
 *
 * Kept separate from the order board on purpose: a waiter call is not a ticket
 * the kitchen cooks, and mixing the two would train staff to skim past both.
 */
export function WaiterCalls({ initialCalls }: { initialCalls: Call[] }) {
  const t = useT();
  // Seeded from the server so the first paint is already correct — and so the
  // effect never has to setState on mount.
  const [calls, setCalls] = useState<Call[]>(initialCalls);

  const load = useCallback(async () => {
    const supabase = createClient();
    // RLS scopes this to the signed-in restaurant.
    const { data } = await supabase
      .from("waiter_calls")
      .select("id, tables(table_number)")
      .eq("acknowledged", false)
      .order("created_at", { ascending: true });

    setCalls(
      (data ?? []).map((row) => ({
        id: row.id,
        tableNumber: row.tables?.table_number ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("waiter-calls")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls" },
        () => void load()
      )
      .subscribe();

    // Same reasoning as the order board: the socket is the fast path, never the
    // only one. A diner waiting because a dropped connection ate their call is
    // exactly the failure this product exists to remove.
    const interval = setInterval(load, REFRESH_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function acknowledge(id: string) {
    const supabase = createClient();
    setCalls((current) => current.filter((call) => call.id !== id));
    await supabase.from("waiter_calls").update({ acknowledged: true }).eq("id", id);
  }

  if (calls.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
      <BellRing className="size-5 shrink-0 animate-pulse text-amber-700 dark:text-amber-400" />
      <span className="font-bold text-amber-900 dark:text-amber-200">
        {interpolate(t.waiter.banner, { count: calls.length })}
      </span>

      <div className="flex flex-wrap gap-2">
        {calls.map((call) => (
          <Button
            key={call.id}
            size="sm"
            variant="outline"
            onClick={() => acknowledge(call.id)}
          >
            <Check />
            {call.tableNumber
              ? interpolate(t.waiter.table, { number: call.tableNumber })
              : t.waiter.acknowledge}
          </Button>
        ))}
      </div>
    </div>
  );
}
