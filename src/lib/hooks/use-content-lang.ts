"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ContentLang } from "@/lib/menu";

/**
 * The customer's chosen menu-content language (REDESIGN_V2_SPEC §10), persisted
 * per visitor. Separate from the UI locale: content can be Arabic, English or
 * Persian, while the chrome only ships Arabic and English dictionaries.
 */
const STORAGE_KEY = "dijla:content-lang";
const DEFAULT: ContentLang = "ar";

let snapshot: { raw: string | null; value: ContentLang } | null = null;
const listeners = new Set<() => void>();

function read(): ContentLang {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT;
  }

  if (snapshot && snapshot.raw === raw) return snapshot.value;
  const value: ContentLang =
    raw === "en" || raw === "fa" || raw === "ar" ? raw : DEFAULT;
  snapshot = { raw, value };
  return value;
}

function write(value: ContentLang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode — the choice still applies for this session.
  }
  snapshot = { raw: value, value };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useContentLang() {
  const lang = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const setLang = useCallback((next: ContentLang) => write(next), []);
  return { lang, setLang };
}
