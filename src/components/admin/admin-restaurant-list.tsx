"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Clock, Loader2, Receipt, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { setRestaurantActive } from "@/app/admin/actions";
import { SubscriptionEditor } from "@/components/admin/subscription-editor";
import { VerificationReview } from "@/components/admin/verification-review";
import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { interpolate } from "@/lib/i18n";
import { daysUntilEnd } from "@/lib/plan";
import { cn } from "@/lib/utils";

export type AdminRestaurant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  verification_status: string | null;
  verification_note: string | null;
  tier: string | null;
  status: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  order_count: number;
  last_order_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  trial: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  past_due: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  cancelled: "bg-destructive/10 text-destructive",
};

/** A restaurant with no orders for this many days is about to churn (C.3.1). */
const DORMANT_DAYS = 7;

/**
 * Days since the last sign of life. A restaurant that has ordered is measured
 * from its last order; one that never has, from when it signed up — so a
 * brand-new signup is not flagged as churning before it has had a chance.
 */
function dormancyDays(r: AdminRestaurant): number {
  const reference = r.last_order_at ?? r.created_at;
  if (!reference) return 0;
  return Math.floor((Date.now() - Date.parse(reference)) / 86_400_000);
}

export function AdminRestaurantList({
  restaurants,
}: {
  restaurants: AdminRestaurant[];
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [dormantOnly, setDormantOnly] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminRestaurant | null>(null);

  const dormantCount = useMemo(
    () => restaurants.filter((r) => dormancyDays(r) >= DORMANT_DAYS).length,
    [restaurants]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (dormantOnly && dormancyDays(r) < DORMANT_DAYS) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
    });
  }, [restaurants, query, dormantOnly]);

  function toggleActive(restaurant: AdminRestaurant, next: boolean) {
    setPendingId(restaurant.id);
    startTransition(async () => {
      const result = await setRestaurantActive(restaurant.id, next);
      setPendingId(null);
      if (!result.ok) toast.error(result.error);
      else toast.success(next ? t.admin.activated : t.admin.suspended);
    });
  }

  const lastActive = (iso: string | null) =>
    iso ? iso.slice(0, 10) : t.admin.never;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="ps-8"
            placeholder={t.admin.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {/* Churn early-warning (C.3.1): call them before they cancel. */}
        <Button
          variant={dormantOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setDormantOnly((v) => !v)}
        >
          <AlertTriangle />
          {interpolate(t.admin.dormantFilter, { count: dormantCount })}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">
          {t.admin.noResults}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {filtered.map((restaurant) => {
            const busy = isPending && pendingId === restaurant.id;
            const status = restaurant.status ?? "trial";
            const daysLeft = daysUntilEnd(restaurant.end_date);
            const dormantDays = dormancyDays(restaurant);
            const isDormant = dormantDays >= DORMANT_DAYS;

            return (
              <li
                key={restaurant.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 p-4",
                  (!restaurant.is_active || isDormant) && "opacity-70"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {restaurant.name}
                    {!restaurant.is_active && (
                      <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-xs">
                        {t.admin.suspendedTag}
                      </span>
                    )}
                    {isDormant && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        <AlertTriangle className="size-3" />
                        {interpolate(t.admin.dormantTag, { count: dormantDays })}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs" dir="ltr">
                    /r/{restaurant.slug}
                  </p>
                  <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1">
                      <Receipt className="size-3" />
                      {interpolate(t.admin.ordersN, {
                        count: Number(restaurant.order_count),
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {lastActive(restaurant.last_order_at)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      STATUS_STYLES[status] ?? STATUS_STYLES.trial
                    )}
                  >
                    {(restaurant.tier === "pro" ? t.admin.pro : t.admin.basic)}
                    {" · "}
                    {t.admin.statuses[status as keyof typeof t.admin.statuses] ?? status}
                  </span>
                  {(status === "trial" || status === "active") && daysLeft >= 0 && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {interpolate(t.admin.daysLeft, { count: daysLeft })}
                    </span>
                  )}
                </div>

                <VerificationReview
                  restaurantId={restaurant.id}
                  restaurantName={restaurant.name}
                  status={restaurant.verification_status ?? "pending"}
                  note={restaurant.verification_note}
                />

                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => setEditing(restaurant)}
                >
                  <SlidersHorizontal />
                  {t.admin.editPlan}
                </Button>

                <div className="flex items-center gap-2">
                  {busy && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
                  <Switch
                    checked={restaurant.is_active}
                    disabled={busy}
                    onCheckedChange={(next) => toggleActive(restaurant, next)}
                    aria-label={t.admin.activeSwitch}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SubscriptionEditor
        restaurant={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
