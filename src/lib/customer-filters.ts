/**
 * Customer menu filtering (REDESIGN_V2_SPEC §5).
 *
 * Pure, client-and-server safe: the filter state, its URL encoding, and the
 * predicate that applies it. Kept out of the component so the "how many match"
 * count shown on the apply button and the "what actually renders" list can never
 * drift apart — they call the same functions.
 *
 * URL rule: filters live in the query string so a filtered menu survives a
 * refresh and can be shared, and only filters go there — never any PII.
 */

import { isMenuTag, type MenuTag } from "@/lib/menu-tags";
import type { MenuCategory } from "@/lib/menu";

export type Filters = {
  /** Category ids; empty = all categories. */
  categories: string[];
  /** Every selected tag must be present on the item (AND). */
  tags: MenuTag[];
  /** Index into the derived price buckets, or null. */
  price: number | null;
  /** Upper bound on prep time in minutes, or null. */
  prep: number | null;
  /** Drop sold-out items entirely. Default off — they show dimmed (§6). */
  hideSoldOut: boolean;
};

export type PriceBucket = { min: number; max: number | null };

export const EMPTY_FILTERS: Filters = {
  categories: [],
  tags: [],
  price: null,
  prep: null,
  hideSoldOut: false,
};

/** A minimal shape both URLSearchParams and Next's ReadonlyURLSearchParams satisfy. */
type ParamsLike = { get(name: string): string | null };

export function parseFilters(params: ParamsLike): Filters {
  const list = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

  const price = Number(params.get("price"));
  const prep = Number(params.get("prep"));

  return {
    categories: list("cat"),
    tags: list("tag").filter(isMenuTag),
    price: Number.isInteger(price) && price >= 0 ? price : null,
    prep: Number.isFinite(prep) && prep > 0 ? prep : null,
    hideSoldOut: params.get("soldout") === "1",
  };
}

/** The query string for a set of filters (without a leading "?"), empty when clear. */
export function filtersToQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.categories.length) params.set("cat", filters.categories.join(","));
  if (filters.tags.length) params.set("tag", filters.tags.join(","));
  if (filters.price !== null) params.set("price", String(filters.price));
  if (filters.prep !== null) params.set("prep", String(filters.prep));
  if (filters.hideSoldOut) params.set("soldout", "1");
  return params.toString();
}

export function isFiltered(filters: Filters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.price !== null ||
    filters.prep !== null ||
    filters.hideSoldOut
  );
}

/** How many distinct facets are active — for the filter button's badge. */
export function activeFacetCount(filters: Filters): number {
  return (
    (filters.categories.length ? 1 : 0) +
    filters.tags.length +
    (filters.price !== null ? 1 : 0) +
    (filters.prep !== null ? 1 : 0) +
    (filters.hideSoldOut ? 1 : 0)
  );
}

function roundNice(value: number): number {
  return Math.max(1000, Math.round(value / 1000) * 1000);
}

/**
 * Three price bands derived from the restaurant's own price distribution
 * (terciles), or none when the menu is too small or too uniform to band.
 */
export function derivePriceBuckets(categories: MenuCategory[]): PriceBucket[] {
  const prices = categories
    .flatMap((category) => category.items.map((item) => item.price))
    .sort((a, b) => a - b);

  if (prices.length < 4) return [];

  const min = prices[0];
  const max = prices[prices.length - 1];
  if (max - min < 1000) return [];

  const t1 = roundNice(prices[Math.floor(prices.length / 3)]);
  const t2 = roundNice(prices[Math.floor((prices.length * 2) / 3)]);
  if (!(t1 > min && t2 > t1)) return [];

  return [
    { min: 0, max: t1 },
    { min: t1, max: t2 },
    { min: t2, max: null },
  ];
}

/** Prep thresholds worth offering — only those that actually split the menu. */
export function derivePrepThresholds(categories: MenuCategory[]): number[] {
  const preps = categories
    .flatMap((category) => category.items.map((item) => item.prepMinutes))
    .filter((value): value is number => value !== null);

  if (preps.length === 0) return [];

  return [15, 30, 45].filter(
    (threshold) =>
      preps.some((value) => value <= threshold) &&
      preps.some((value) => value > threshold)
  );
}

function itemMatches(
  item: MenuCategory["items"][number],
  filters: Filters,
  buckets: PriceBucket[]
): boolean {
  if (filters.hideSoldOut && !item.isAvailable) return false;

  if (filters.tags.length && !filters.tags.every((tag) => item.tags.includes(tag))) {
    return false;
  }

  if (filters.price !== null) {
    const bucket = buckets[filters.price];
    if (bucket) {
      if (item.price < bucket.min) return false;
      if (bucket.max !== null && item.price >= bucket.max) return false;
    }
  }

  if (filters.prep !== null) {
    // Unknown prep time is excluded while a prep filter is on — a promise of
    // "under 15 minutes" must not include a dish nobody timed.
    if (item.prepMinutes === null || item.prepMinutes > filters.prep) return false;
  }

  return true;
}

/** The categories a filter set leaves, empties dropped. */
export function applyFilters(
  categories: MenuCategory[],
  filters: Filters,
  buckets: PriceBucket[]
): MenuCategory[] {
  return categories
    .filter(
      (category) =>
        filters.categories.length === 0 || filters.categories.includes(category.id)
    )
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => itemMatches(item, filters, buckets)),
    }))
    .filter((category) => category.items.length > 0);
}

export function countMatches(
  categories: MenuCategory[],
  filters: Filters,
  buckets: PriceBucket[]
): number {
  return applyFilters(categories, filters, buckets).reduce(
    (total, category) => total + category.items.length,
    0
  );
}
