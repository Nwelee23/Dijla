/**
 * Customer menu layout (REDESIGN_V2_SPEC §8). The owner picks one in settings;
 * `auto` chooses for them from photo coverage so even an untouched menu looks
 * right. Pure and unit-tested — the rendering lives in MenuBrowser.
 */

import type { MenuCategory } from "@/lib/menu";

export const MENU_LAYOUTS = ["auto", "grid", "list", "featured"] as const;
export type MenuLayoutSetting = (typeof MENU_LAYOUTS)[number];

/** What actually renders — `auto` is resolved away. */
export type ResolvedLayout = "grid" | "list" | "featured";

export function isMenuLayout(value: string): value is MenuLayoutSetting {
  return (MENU_LAYOUTS as readonly string[]).includes(value);
}

/** Share of items that carry a photo, used to resolve `auto`. */
export function photoCoverage(categories: MenuCategory[]): number {
  const items = categories.flatMap((category) => category.items);
  if (items.length === 0) return 0;
  return items.filter((item) => item.imageUrl).length / items.length;
}

/**
 * Resolve the stored setting to a concrete layout. `grid`/`list`/`featured`
 * pass through; `auto` (or any unknown value) picks the photo grid when at least
 * half the items have a photo, otherwise the compact list.
 */
export function resolveMenuLayout(
  setting: string | null | undefined,
  categories: MenuCategory[]
): ResolvedLayout {
  if (setting === "grid" || setting === "list" || setting === "featured") {
    return setting;
  }
  return photoCoverage(categories) >= 0.5 ? "grid" : "list";
}
