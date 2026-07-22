import type { Dictionary } from "@/lib/i18n";

/**
 * Restaurant categories collected at signup (AUTH_UI_SPEC §4). Only keys live
 * here; the labels are in the dictionaries so changing UI language never orphans
 * a stored value — the same discipline as areas.ts.
 */
export const RESTAURANT_TYPE_KEYS = [
  "nashami", // نشامي — grill house
  "iraqi", // عراقي
  "fastfood", // وجبات سريعة
  "drinks_sweets", // مشروبات وحلويات
  "other", // أخرى
] as const;

export type RestaurantTypeKey = (typeof RESTAURANT_TYPE_KEYS)[number];

export function restaurantTypeOptions(t: Dictionary) {
  return RESTAURANT_TYPE_KEYS.map((key) => ({
    key,
    label: t.restaurantTypes[key],
  }));
}

export function isRestaurantTypeKey(value: string): value is RestaurantTypeKey {
  return (RESTAURANT_TYPE_KEYS as readonly string[]).includes(value);
}
