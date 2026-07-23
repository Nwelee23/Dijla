/**
 * Parsing for the customer menu payload.
 *
 * `get_menu_by_qr_token` returns jsonb, which TypeScript only knows as `Json`.
 * Casting it to a nice interface would be a lie the compiler happily accepts —
 * and this payload renders on a stranger's phone in a restaurant, where a
 * `undefined is not an object` blank screen costs a real order. So it is parsed
 * and narrowed, and anything malformed is dropped rather than rendered.
 */

export type MenuOption = {
  id: string;
  name: string;
  priceDelta: number;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  /** 1 = single choice (size); >1 = multi-select (extras). */
  maxSelect: number;
  options: MenuOption[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  optionGroups: MenuOptionGroup[];
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
  /** Which checkout options the owner takes. Absent on the dine-in payload. */
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  /** Delivery only. 0 means no minimum. */
  minOrder: number;
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

function parseOption(value: unknown): MenuOption | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;
  return { id, name, priceDelta: asNumber(value.price_delta) ?? 0 };
}

function parseOptionGroup(value: unknown): MenuOptionGroup | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const name = asString(value.name);
  if (!id || !name) return null;

  const options = Array.isArray(value.options)
    ? value.options.map(parseOption).filter((o): o is MenuOption => o !== null)
    : [];
  // A group with no options is nothing to choose from — drop it.
  if (options.length === 0) return null;

  const maxSelect = asNumber(value.max_select) ?? 1;
  return {
    id,
    name,
    isRequired: value.is_required === true,
    maxSelect: maxSelect >= 1 ? Math.floor(maxSelect) : 1,
    options,
  };
}

function parseItem(value: unknown): MenuItem | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const name = asString(value.name);
  const price = asNumber(value.price);
  if (!id || !name || price === null) return null;

  const optionGroups = Array.isArray(value.option_groups)
    ? value.option_groups
        .map(parseOptionGroup)
        .filter((g): g is MenuOptionGroup => g !== null)
    : [];

  return {
    id,
    name,
    price,
    description: asString(value.description),
    imageUrl: asString(value.image_url),
    optionGroups,
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
    // Absent means the database has not been migrated yet, or this is the
    // dine-in payload, which carries no channel toggles. Both read as "take the
    // order" — the same thing the app did before these existed. A missing field
    // must never be the reason a restaurant stops selling.
    deliveryEnabled: value.delivery_enabled !== false,
    pickupEnabled: value.pickup_enabled !== false,
    minOrder: asNumber(value.min_order) ?? 0,
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
