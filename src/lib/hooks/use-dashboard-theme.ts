"use client";

import { useCallback, useSyncExternalStore } from "react";

export type DashboardTheme = "dark" | "light";

const STORAGE_KEY = "dijla:dashboard-theme";

/**
 * Staff surfaces open dark and stay dark unless the user says otherwise —
 * kitchens run long shifts and the board is stared at for hours.
 *
 * This is deliberately kept separate from the public `next-themes` preference
 * rather than reusing it. The public default is *light* (customers, food
 * photography), and next-themes cannot express two different defaults from one
 * stored value: a shared value would make the dashboard open light on every
 * fresh device, because "light" as a default is indistinguishable from "light"
 * as a deliberate choice. Two stores, one default each, and no ambiguity.
 */
const DEFAULT: DashboardTheme = "dark";

let snapshot: { raw: string | null; value: DashboardTheme } | null = null;
const listeners = new Set<() => void>();

function read(): DashboardTheme {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT;
  }

  // useSyncExternalStore compares by reference every render, so the snapshot is
  // cached against the raw string rather than re-derived each time.
  if (snapshot && snapshot.raw === raw) return snapshot.value;

  const value: DashboardTheme = raw === "light" || raw === "dark" ? raw : DEFAULT;
  snapshot = { raw, value };
  return value;
}

function write(value: DashboardTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode, locked-down device) — the choice still
    // applies for this session, it just will not survive a reload.
  }
  snapshot = { raw: value, value };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The dark/light choice for the staff surfaces (dashboard, driver, admin).
 *
 * The server snapshot is the dark default, so the markup streamed to the device
 * is already dark for the overwhelming majority who never touch the switch.
 */
export function useDashboardTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => DEFAULT);

  const setTheme = useCallback((next: DashboardTheme) => write(next), []);
  const toggle = useCallback(
    () => write(read() === "dark" ? "light" : "dark"),
    []
  );

  return { theme, setTheme, toggle };
}
