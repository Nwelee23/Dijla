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
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The single forward step staff take from each state, or null at the end. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
  cancelled: null,
};

/** Orders still needing attention. Anything else has left the floor. */
export const ACTIVE_STATUSES: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
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
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};
