import { DEFAULT_LOCALE, type Locale } from "./config";
import { ar } from "./dictionaries/ar";
import { ckb } from "./dictionaries/ckb";
import { en } from "./dictionaries/en";
import { kmr } from "./dictionaries/kmr";
import type { Dictionary } from "./types";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { ar, ckb, kmr, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Fills `{placeholders}` in a translated string.
 *
 *   interpolate(t.nav.buildingIn, { phase: t.phases.phase2 })
 *
 * Kept deliberately dumb: no plural rules, no dates. Arabic and Kurdish both
 * have plural systems this could not model honestly, so anywhere a count
 * matters the dictionaries carry separate keys instead.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}
