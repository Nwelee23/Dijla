import { slugify } from "@/lib/slug";

/**
 * Username rules (AUTH_UI_SPEC §5): latin letters, digits and underscore,
 * 4–20 chars, lowercase. Arabic usernames break keyboards and URL handling, so
 * the handle is always latin even though the product is Arabic-first.
 */
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z0-9_]{4,20}$/;

/** Strip to the allowed charset and lowercase — what the field enforces live. */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX);
}

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

/**
 * Auto-suggest a handle from the restaurant name + city, e.g. "alfurat_najaf".
 * The name is Arabic, so it is transliterated via slugify; an all-unmapped name
 * falls back to a neutral "matam" (مطعم) seed.
 */
export function suggestUsername(name: string, city: string): string {
  const base = slugify(name).replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  const seed = !base || base.startsWith("restaurant_") ? "matam" : base.split("_")[0] || "matam";
  const c = (city || "").toLowerCase().replace(/[^a-z0-9_]/g, "");

  let s = (c ? `${seed}_${c}` : seed).slice(0, USERNAME_MAX);
  if (s.length < USERNAME_MIN) s = `${s}_matam`.slice(0, USERNAME_MAX);
  return s;
}
