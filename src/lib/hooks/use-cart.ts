"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { MenuItem, MenuOption } from "@/lib/menu";

export type CartLine = {
  itemId: string;
  name: string;
  /** Kept only to render the cart; the server recomputes the real price. */
  price: number;
  quantity: number;
  note: string;
  /** Selected option ids, sent to the server (which re-reads and re-prices them). */
  optionIds: string[];
  /** Snapshot for rendering the cart line; the server owns the real deltas. */
  options: { name: string; priceDelta: number }[];
  /** Sum of the selected deltas, for the display subtotal only. */
  extra: number;
};

const STORAGE_PREFIX = "dijla:cart:";

/** Stable reference: returning a fresh [] each read would loop React forever. */
const EMPTY: CartLine[] = [];

const snapshots = new Map<string, { raw: string | null; value: CartLine[] }>();
const listeners = new Map<string, Set<() => void>>();

function read(key: string): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Private browsing can throw on access alone.
  }

  // useSyncExternalStore calls this on every render, so the same underlying
  // string must always yield the same array instance.
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value;

  let value: CartLine[] = EMPTY;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) value = parsed as CartLine[];
    } catch {
      // Corrupt storage: start empty rather than break the menu.
    }
  }

  snapshots.set(key, { raw, value });
  return value;
}

function write(key: string, lines: CartLine[]) {
  const raw = JSON.stringify(lines);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // Full quota or private mode — the cart still works in memory.
  }
  snapshots.set(key, { raw, value: lines });
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  // Same table open in two tabs should not show two different baskets.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The diner's basket, scoped to one table and kept in localStorage.
 *
 * Persisted because phones lock, calls interrupt, and Iraqi mobile data drops —
 * losing a half-built order to a screen timeout is what makes someone put the
 * phone down and wave a waiter over instead.
 *
 * Read through useSyncExternalStore rather than an effect: localStorage is an
 * external store, the server snapshot is empty, and this keeps hydration honest
 * without setting state during render.
 *
 * Prices here are for display only. `POST /api/orders` re-reads every price from
 * the database, so a tampered basket cannot change what anyone is charged.
 */
export function useCart(tableId: string) {
  const storageKey = `${STORAGE_PREFIX}${tableId}`;

  const lines = useSyncExternalStore(
    useCallback((listener) => subscribe(storageKey, listener), [storageKey]),
    useCallback(() => read(storageKey), [storageKey]),
    () => EMPTY
  );

  const add = useCallback(
    (item: MenuItem, quantity: number, note: string, options: MenuOption[] = []) => {
      const trimmed = note.trim();
      const optionIds = options.map((o) => o.id).sort();
      const extra = options.reduce((sum, o) => sum + o.priceDelta, 0);
      const key = optionIds.join(",");
      const current = read(storageKey);

      // Same dish is a separate line if its note OR its chosen options differ:
      // "large + extra cheese" and "small" must never merge into one.
      const index = current.findIndex(
        (line) =>
          line.itemId === item.id &&
          line.note === trimmed &&
          [...(line.optionIds ?? [])].sort().join(",") === key
      );

      if (index !== -1) {
        const next = [...current];
        next[index] = { ...next[index], quantity: next[index].quantity + quantity };
        write(storageKey, next);
        return;
      }

      write(storageKey, [
        ...current,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          note: trimmed,
          optionIds,
          options: options.map((o) => ({ name: o.name, priceDelta: o.priceDelta })),
          extra,
        },
      ]);
    },
    [storageKey]
  );

  const setQuantity = useCallback(
    (index: number, quantity: number) => {
      const current = read(storageKey);
      write(
        storageKey,
        quantity <= 0
          ? current.filter((_, i) => i !== index)
          : current.map((line, i) =>
              i === index ? { ...line, quantity } : line
            )
      );
    },
    [storageKey]
  );

  const remove = useCallback(
    (index: number) => {
      write(
        storageKey,
        read(storageKey).filter((_, i) => i !== index)
      );
    },
    [storageKey]
  );

  const clear = useCallback(() => write(storageKey, []), [storageKey]);

  const { count, subtotal } = useMemo(
    () => ({
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce(
        (sum, line) => sum + (line.price + (line.extra ?? 0)) * line.quantity,
        0
      ),
    }),
    [lines]
  );

  return { lines, count, subtotal, add, setQuantity, remove, clear };
}
