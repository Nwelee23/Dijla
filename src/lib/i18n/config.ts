/**
 * Arabic is the product's first language; English is the second. One is
 * right-to-left and one is left-to-right, so direction is a property of the
 * locale and never an assumption baked into a component.
 */

export const LOCALES = ["ar", "en"] as const;
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
  en: { name: "English", dir: "ltr", tag: "en" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function localeDir(locale: Locale) {
  return LOCALE_META[locale].dir;
}
