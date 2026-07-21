/**
 * Parsing for the customer menu payload.
 *
 * `get_menu_by_qr_token` returns jsonb, which TypeScript only knows as `Json`.
 * Casting it to a nice interface would be a lie the compiler happily accepts —
 * and this payload renders on a stranger's phone in a restaurant, where a
 * `undefined is not an object` blank screen costs a real order. So it is parsed
 * and narrowed, and anything malformed is dropped rather than rendered.
 */

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};

export type MenuRestaurant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  /** Only present on the delivery payload. */
  deliveryFee: number;
};

export type MenuTable = {
  id: string;
  tableNumber: string;
  label: string | null;
};

export type DineInMenu = {
  restaurant: MenuRestaurant;
  table: MenuTable;
  categories: MenuCategory[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  // numeric(10,2) arrives as a string over PostgREST, not a number.
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseItem(value: unknown): MenuItem | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  const price = asNumber(value.price);
  if (!id || !name || price === null) return null;

  return {
    id,
    name,
    price,
    description: asString(value.description),
    imageUrl: asString(value.image_url),
  };
}

function parseCategories(value: unknown): MenuCategory[] {
  if (!Array.isArray(value)) return [];

  const categories: MenuCategory[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;

    const id = asString(raw.id);
    const name = asString(raw.name);
    if (!id || !name) continue;

    const items = Array.isArray(raw.items)
      ? raw.items.map(parseItem).filter((item): item is MenuItem => item !== null)
      : [];

    // An empty section on a menu reads as a broken app.
    if (items.length === 0) continue;

    categories.push({ id, name, items });
  }
  return categories;
}

function parseRestaurant(value: unknown): MenuRestaurant | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  const slug = asString(value.slug);
  if (!id || !name || !slug) return null;

  return {
    id,
    name,
    slug,
    logoUrl: asString(value.logo_url),
    currency: asString(value.currency) ?? "IQD",
    deliveryFee: asNumber(value.delivery_fee) ?? 0,
  };
}

function parseTable(value: unknown): MenuTable | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const tableNumber = asString(value.table_number);
  if (!id || !tableNumber) return null;

  return { id, tableNumber, label: asString(value.label) };
}

export type RestaurantMenu = {
  restaurant: MenuRestaurant;
  categories: MenuCategory[];
};

/** The delivery-link payload: a restaurant and its menu, with no table. */
export function parseRestaurantMenu(payload: unknown): RestaurantMenu | null {
  if (!isRecord(payload)) return null;

  const restaurant = parseRestaurant(payload.restaurant);
  if (!restaurant) return null;

  return { restaurant, categories: parseCategories(payload.categories) };
}

/** Returns null for anything that isn't a complete, usable dine-in menu. */
export function parseDineInMenu(payload: unknown): DineInMenu | null {
  if (!isRecord(payload)) return null;

  const restaurant = parseRestaurant(payload.restaurant);
  const table = parseTable(payload.table);
  if (!restaurant || !table) return null;

  return {
    restaurant,
    table,
    categories: parseCategories(payload.categories),
  };
}
