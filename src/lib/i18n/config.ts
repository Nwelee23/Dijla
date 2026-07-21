/**
 * Dijla speaks four languages. Two are right-to-left and two are left-to-right,
 * so direction is a property of the locale, never an assumption in a component.
 */

export const LOCALES = ["ar", "ckb", "kmr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

/** Cookie the dashboard and driver app remember the staff choice in. */
export const LOCALE_COOKIE = "dijla-locale";

export type LocaleMeta = {
  /** Written in its own language — never translate a language name. */
  name: string;
  dir: "rtl" | "ltr";
  /** BCP-47 tag for <html lang> and Intl formatting. */
  tag: string;
};

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  ar: { name: "العربية", dir: "rtl", tag: "ar-IQ" },
  // Sorani — Arabic script, right-to-left. The Kurdish of Erbil and Sulaymaniyah.
  ckb: { name: "کوردیی ناوەندی", dir: "rtl", tag: "ckb-IQ" },
  // Kurmanji — Latin script, left-to-right.
  kmr: { name: "Kurdî (Kurmancî)", dir: "ltr", tag: "kmr" },
  en: { name: "English", dir: "ltr", tag: "en" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function localeDir(locale: Locale) {
  return LOCALE_META[locale].dir;
}
