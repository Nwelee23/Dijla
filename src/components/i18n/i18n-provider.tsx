"use client";

import { createContext, use } from "react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";

type I18nValue = { locale: Locale; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Puts the active dictionary in context once, from the root layout.
 *
 * The whole dictionary crosses to the client rather than being fetched: it is a
 * few KB, it is already in the RSC payload, and it means no client component
 * ever waits on a network round-trip to render a button label.
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <I18nContext value={{ locale, t: dictionary }}>{children}</I18nContext>
  );
}

export function useI18n(): I18nValue {
  const value = use(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside <I18nProvider>");
  }
  return value;
}

/** Shorthand for the common case. */
export function useT(): Dictionary {
  return useI18n().t;
}
