import type { Dictionary } from "@/lib/i18n";

/**
 * Service areas, Najaf first — the pilot city — then the governorates the
 * pilot is likely to reach next.
 *
 * Only keys live here. The names themselves are in the dictionaries, so an
 * English-speaking owner sees "Najaf" and a Kurmanji one sees "Necef" without
 * a second list drifting out of sync.
 */
export const AREA_KEYS = [
  "najaf",
  "kufa",
  "mishkhab",
  "manathira",
  "hira",
  "karbala",
  "diwaniya",
  "babil",
] as const;

export type AreaKey = (typeof AREA_KEYS)[number];

/**
 * The value stored in `restaurants.area` is the key, not the label — otherwise
 * changing the UI language would orphan every existing restaurant's area.
 */
export function areaOptions(t: Dictionary) {
  return AREA_KEYS.map((key) => ({ key, label: t.areas[key] }));
}

/** Existing rows may hold a raw Arabic name from before this list existed. */
export function areaLabel(t: Dictionary, stored: string | null): string | null {
  if (!stored) return null;
  return (t.areas as Record<string, string>)[stored] ?? stored;
}
