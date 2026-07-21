/**
 * Limits for anonymous order placement.
 *
 * `POST /api/orders` is the only endpoint on the platform that takes writes from
 * someone with no account, so every bound a real order should respect is stated
 * here rather than left to whatever the browser happened to send.
 */

/** Distinct lines in one order. A menu has tens of dishes, not hundreds. */
export const MAX_ORDER_LINES = 40;

/** Per line. Twelve of one dish is a large table; a thousand is an attack. */
export const MAX_LINE_QUANTITY = 50;

/** Matches the customer note input. */
export const MAX_NOTE_LENGTH = 140;

/**
 * Orders one table may place inside the window. A table of eight ordering in
 * rounds stays well under this; a script hammering a stolen qr_token does not.
 */
export const RATE_LIMIT_MAX_ORDERS = 10;
export const RATE_LIMIT_WINDOW_MINUTES = 10;

export type OrderLineInput = {
  itemId: string;
  quantity: number;
  note: string;
};

export type PlaceOrderRequest = {
  qrToken: string;
  /**
   * One id per submission, reused across retries. A unique index on the column
   * makes the database decide what a duplicate is, so a double-tap or a retry
   * after a lost response returns the original order rather than cooking twice.
   */
  requestId: string;
  lines: OrderLineInput[];
};

export type PlaceOrderResponse =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; error: OrderError };

/** Codes, not sentences: the client owns the language. */
export type OrderError =
  | "invalid_request"
  | "invalid_table"
  | "empty_order"
  | "too_many_lines"
  | "invalid_quantity"
  | "unavailable_items"
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

  if (typeof raw.qrToken !== "string" || raw.qrToken.length === 0) {
    return { ok: false, error: "invalid_request" };
  }
  if (typeof raw.requestId !== "string" || !UUID.test(raw.requestId)) {
    return { ok: false, error: "invalid_request" };
  }
  if (!Array.isArray(raw.lines)) {
    return { ok: false, error: "invalid_request" };
  }
  if (raw.lines.length === 0) {
    return { ok: false, error: "empty_order" };
  }
  if (raw.lines.length > MAX_ORDER_LINES) {
    return { ok: false, error: "too_many_lines" };
  }

  const lines: OrderLineInput[] = [];
  for (const entry of raw.lines) {
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

  return { ok: true, value: { qrToken: raw.qrToken, requestId: raw.requestId, lines } };
}
