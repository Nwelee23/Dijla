import type { Dictionary } from "@/lib/i18n";

/**
 * Dine-in status flow.
 *
 * The brief names the last step "served" / "completed", but neither is a legal
 * value: `orders.status` carries a CHECK constraint from 0001 listing
 * new | accepted | preparing | ready | out_for_delivery | delivered | cancelled.
 * Inserting "served" would fail at runtime, in the kitchen, mid-service. So
 * `delivered` is the terminal dine-in state and the UI simply labels it
 * "served" — the wording is a translation concern, the value is a schema one.
 */
export const ORDER_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderType = "dine_in" | "delivery" | "pickup";

/**
 * The single forward step staff take, which depends on the kind of order.
 *
 * Only delivery passes through `out_for_delivery`: a dine-in order goes from
 * the pass to the table, and a pickup order waits on the counter. Offering that
 * button on those would put an order into a state nobody will ever move it out
 * of.
 */
const NEXT_BY_TYPE: Record<OrderType, Partial<Record<OrderStatus, OrderStatus>>> = {
  dine_in: { new: "accepted", accepted: "preparing", preparing: "ready", ready: "delivered" },
  pickup: { new: "accepted", accepted: "preparing", preparing: "ready", ready: "delivered" },
  delivery: {
    new: "accepted",
    accepted: "preparing",
    preparing: "ready",
    ready: "out_for_delivery",
    out_for_delivery: "delivered",
  },
};

export function nextStatus(status: string, type: string): OrderStatus | null {
  const flow = NEXT_BY_TYPE[(type as OrderType) in NEXT_BY_TYPE ? (type as OrderType) : "dine_in"];
  return flow[status as OrderStatus] ?? null;
}

/** Orders still needing attention. Anything else has left the floor. */
export const ACTIVE_STATUSES: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
];

export function isActive(status: string): boolean {
  return ACTIVE_STATUSES.includes(status as OrderStatus);
}

export function statusLabel(t: Dictionary, status: string): string {
  return (t.orders.status as Record<string, string>)[status] ?? status;
}

/** Tailwind classes per status, so a glance across the board reads instantly. */
export const STATUS_STYLES: Record<OrderStatus, string> = {
  new: "bg-primary text-primary-foreground",
  accepted: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  preparing:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ready:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  out_for_delivery:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};
