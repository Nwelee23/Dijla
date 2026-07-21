"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PlacedOrder = {
  orderId: string;
  orderNumber: number;
  placedAt: number;
};

const STORAGE_PREFIX = "dijla:order:";

/** How long the confirmation stays on screen before the table is free again. */
const KEEP_FOR_MS = 3 * 60 * 60 * 1000;

const snapshots = new Map<string, { raw: string | null; value: PlacedOrder | null }>();
const listeners = new Map<string, Set<() => void>>();

function read(key: string): PlacedOrder | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }

  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value;

  let value: PlacedOrder | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PlacedOrder;
      // A stale confirmation from yesterday's lunch must not greet the next
      // diner who sits at this table and scans the same sticker.
      if (
        typeof parsed?.orderId === "string" &&
        typeof parsed?.orderNumber === "number" &&
        Date.now() - parsed.placedAt < KEEP_FOR_MS
      ) {
        value = parsed;
      }
    } catch {
      // Corrupt entry: treat as no order.
    }
  }

  snapshots.set(key, { raw, value });
  return value;
}

function write(key: string, order: PlacedOrder | null) {
  const raw = order ? JSON.stringify(order) : null;
  try {
    if (raw) window.localStorage.setItem(key, raw);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable — the confirmation still shows for this render.
  }
  snapshots.set(key, { raw, value: order });
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => set.delete(listener);
}

/**
 * The order this device most recently placed at this table.
 *
 * Kept so a diner who locks their phone, or reopens the QR, lands back on their
 * confirmation and order number instead of an empty menu wondering whether it
 * went through.
 */
export function usePlacedOrder(tableId: string) {
  const storageKey = `${STORAGE_PREFIX}${tableId}`;

  const order = useSyncExternalStore(
    useCallback((listener) => subscribe(storageKey, listener), [storageKey]),
    useCallback(() => read(storageKey), [storageKey]),
    () => null
  );

  const save = useCallback(
    (orderId: string, orderNumber: number) =>
      write(storageKey, { orderId, orderNumber, placedAt: Date.now() }),
    [storageKey]
  );

  const clearOrder = useCallback(() => write(storageKey, null), [storageKey]);

  return { order, save, clearOrder };
}
