import Link from "next/link";
import { Archive, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { interpolate, type Dictionary } from "@/lib/i18n";
import { STATUS_STYLES, statusLabel, type OrderStatus } from "@/lib/order-status";
import { createClient } from "@/lib/supabase/server";
import { cn, formatMoney } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t.orders.archiveTitle };
}

/** Midnight today in Baghdad (UTC+3, no DST in Iraq), as an ISO instant. */
function baghdadDayStartISO(): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${today}T00:00:00+03:00`;
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function typeLabel(t: Dictionary, type: string): string {
  if (type === "delivery") return t.checkout.delivery;
  if (type === "pickup") return t.checkout.pickup;
  return t.orders.dineIn;
}

/**
 * The day archive (ORDERS_DASHBOARD_SPEC §8). Orders are never deleted — once
 * delivered or cancelled they leave the live board and land here, for
 * end-of-day accounting and customer disputes. Scoped to today (Baghdad) and to
 * this restaurant by RLS.
 */
export default async function ArchivePage() {
  const [t, supabase] = await Promise.all([getT(), createClient()]);

  const { data } = await supabase
    .from("orders")
    .select("id, order_number, type, status, total, created_at, cancellation_reason")
    .in("status", ["delivered", "cancelled"])
    .gte("created_at", baghdadDayStartISO())
    .order("created_at", { ascending: false });

  const orders = data ?? [];
  const completed = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const revenue = completed.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Archive className="size-6" />
            {t.orders.archiveTitle}
          </h1>
          <p className="text-muted-foreground text-sm">{t.orders.archiveHint}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/orders">
            {t.orders.backToBoard}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t.orders.completedToday} value={String(completed.length)} />
        <Stat label={t.orders.revenueToday} value={formatMoney(revenue)} />
        <Stat label={t.orders.cancelledToday} value={String(cancelled.length)} />
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border py-16 text-center text-sm">
          {t.orders.archiveEmpty}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {orders.map((order) => (
            <li key={order.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-bold tabular-nums">
                  {interpolate(t.orders.orderNumber, { number: order.order_number })}
                  <span className="text-muted-foreground ms-2 text-sm font-normal">
                    {typeLabel(t, order.type)}
                  </span>
                </p>
                {order.status === "cancelled" && order.cancellation_reason && (
                  <p className="text-muted-foreground text-sm">{order.cancellation_reason}</p>
                )}
              </div>
              <div className="shrink-0 text-end">
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    STATUS_STYLES[order.status as OrderStatus] ?? STATUS_STYLES.delivered
                  )}
                >
                  {statusLabel(t, order.status)}
                </span>
                <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                  {formatMoney(Number(order.total))} · {timeLabel(order.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
