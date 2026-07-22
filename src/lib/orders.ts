/**
 * Limits for anonymous order placement.
 *
 * `POST /api/orders` is the only endpoint on the platform that takes writes from
 * someone with no account, so every bound a real order should respect is stated
 * here rather than left to whatever the browser happened to send.
 */

import { isPlausibleIraqPin } from "@/lib/geo";

/** Distinct lines in one order. A menu has tens of dishes, not hundreds. */
export const MAX_ORDER_LINES = 40;

/** Per line. Twelve of one dish is a large table; a thousand is an attack. */
export const MAX_LINE_QUANTITY = 50;

/** Matches the customer note input. */
export const MAX_NOTE_LENGTH = 140;
export const MAX_LANDMARK_LENGTH = 160;
export const MAX_NAME_LENGTH = 80;

/**
 * Orders one table may place inside the window. A table of eight ordering in
 * rounds stays well under this; a script hammering a stolen qr_token does not.
 */
export const RATE_LIMIT_MAX_ORDERS = 10;
export const RATE_LIMIT_WINDOW_MINUTES = 10;

/**
 * A second, restaurant-wide cap on the public delivery/pickup channel.
 *
 * The per-phone limit is the front line, but a phone number is trivially
 * rotated, so a flood of fake delivery orders can slip past it. This bounds the
 * whole restaurant's anonymous intake in the window instead. It is set far above
 * any real restaurant's rate — thirty delivery orders in ten minutes is a rush
 * few kitchens could keep up with — so it never throttles a busy evening; it
 * exists only to blunt a script hammering /r.
 */
export const RATE_LIMIT_MAX_PER_RESTAURANT = 30;

export type OrderLineInput = {
  itemId: string;
  quantity: number;
  note: string;
};

export type CustomerInput = {
  name: string;
  phone: string;
  landmark: string;
  notes: string;
  lat: number | null;
  lng: number | null;
};

/**
 * One id per submission, reused across retries. A unique index on the column
 * makes the database decide what a duplicate is, so a double-tap or a retry
 * after a lost response returns the original order rather than cooking twice.
 */
type Common = { requestId: string; lines: OrderLineInput[] };

/**
 * Two ways to place an order, and the difference is who vouches for it.
 *
 * Dine-in is vouched for by the table's token — the diner is sitting in the
 * restaurant, so there is nothing to ask them. Delivery and pickup have no
 * token, so the customer has to say who they are and, for delivery, where.
 */
export type PlaceOrderRequest =
  | ({ mode: "dine_in"; qrToken: string } & Common)
  | ({
      mode: "delivery" | "pickup";
      slug: string;
      customer: CustomerInput;
    } & Common);

export type PlaceOrderResponse =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; error: OrderError };

/** Codes, not sentences: the client owns the language. */
export type OrderError =
  | "invalid_request"
  | "invalid_table"
  | "invalid_restaurant"
  | "needs_name"
  | "needs_phone"
  | "needs_location"
  | "empty_order"
  | "too_many_lines"
  | "invalid_quantity"
  | "unavailable_items"
  | "delivery_disabled"
  | "pickup_disabled"
  | "below_min_order"
  | "closed"
  | "rate_limited"
  | "server_error";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Narrows an untrusted request body. Deliberately strict: anything unexpected
 * is rejected rather than coerced, because the only caller that sends a shape
 * we did not design is one probing for a way in.
 */
export function parseOrderRequest(
  body: unknown
): { ok: true; value: PlaceOrderRequest } | { ok: false; error: OrderError } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid_request" };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.requestId !== "string" || !UUID.test(raw.requestId)) {
    return { ok: false, error: "invalid_request" };
  }

  const lines = parseLines(raw.lines);
  if (!lines.ok) return lines;

  const common = { requestId: raw.requestId, lines: lines.value };

  // Dine-in: the token is the whole identity.
  if (typeof raw.qrToken === "string" && raw.qrToken.length > 0) {
    return { ok: true, value: { mode: "dine_in", qrToken: raw.qrToken, ...common } };
  }

  if (typeof raw.slug !== "string" || raw.slug.length === 0) {
    return { ok: false, error: "invalid_request" };
  }
  if (raw.type !== "delivery" && raw.type !== "pickup") {
    return { ok: false, error: "invalid_request" };
  }

  const customerRaw =
    typeof raw.customer === "object" && raw.customer !== null
      ? (raw.customer as Record<string, unknown>)
      : {};

  const name = typeof customerRaw.name === "string" ? customerRaw.name.trim() : "";
  const phone = typeof customerRaw.phone === "string" ? customerRaw.phone.trim() : "";
  const landmark =
    typeof customerRaw.landmark === "string"
      ? customerRaw.landmark.trim().slice(0, MAX_LANDMARK_LENGTH)
      : "";
  const notes =
    typeof customerRaw.notes === "string"
      ? customerRaw.notes.trim().slice(0, MAX_LANDMARK_LENGTH)
      : "";

  if (!name) return { ok: false, error: "needs_name" };
  if (!phone) return { ok: false, error: "needs_phone" };

  const lat = parseCoordinate(customerRaw.lat, 90);
  const lng = parseCoordinate(customerRaw.lng, 180);
  // A pin is only a pin if both halves survived, and if it lands somewhere a
  // driver could actually go. Half a coordinate would put the driver on the
  // equator; an IP-geolocated one behind a VPN would send them to Frankfurt.
  // Both are worse than no pin, because a pin gets believed.
  const hasPin = isPlausibleIraqPin(lat, lng);

  // Delivery needs somewhere to go. Iraqi addresses are not navigable, so it is
  // a pin or a landmark — an order with neither cannot be delivered by anyone.
  if (raw.type === "delivery" && !hasPin && !landmark) {
    return { ok: false, error: "needs_location" };
  }

  return {
    ok: true,
    value: {
      mode: raw.type,
      slug: raw.slug,
      customer: {
        name: name.slice(0, MAX_NAME_LENGTH),
        phone,
        landmark,
        notes,
        // Pickup carries no location at all, even if the browser sent one.
        lat: raw.type === "delivery" && hasPin ? lat : null,
        lng: raw.type === "delivery" && hasPin ? lng : null,
      },
      ...common,
    },
  };
}

function parseCoordinate(value: unknown, limit: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.abs(value) <= limit ? value : null;
}

function parseLines(
  value: unknown
): { ok: true; value: OrderLineInput[] } | { ok: false; error: OrderError } {
  if (!Array.isArray(value)) return { ok: false, error: "invalid_request" };
  if (value.length === 0) return { ok: false, error: "empty_order" };
  if (value.length > MAX_ORDER_LINES) return { ok: false, error: "too_many_lines" };

  const lines: OrderLineInput[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, error: "invalid_request" };
    }
    const line = entry as Record<string, unknown>;

    if (typeof line.itemId !== "string" || !UUID.test(line.itemId)) {
      return { ok: false, error: "invalid_request" };
    }
    if (
      typeof line.quantity !== "number" ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_LINE_QUANTITY
    ) {
      return { ok: false, error: "invalid_quantity" };
    }

    const note = typeof line.note === "string" ? line.note.trim() : "";
    lines.push({
      itemId: line.itemId,
      quantity: line.quantity,
      note: note.slice(0, MAX_NOTE_LENGTH),
    });
  }

  return { ok: true, value: lines };
}
