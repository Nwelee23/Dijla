import { describe, expect, it } from "vitest";

import { MAX_ORDER_LINES, parseOrderRequest } from "@/lib/orders";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const OPTION_ID = "33333333-3333-4333-8333-333333333333";

const line = (over: Record<string, unknown> = {}) => ({
  itemId: ITEM_ID,
  quantity: 1,
  ...over,
});

describe("parseOrderRequest", () => {
  it("rejects a non-object body", () => {
    expect(parseOrderRequest(null).ok).toBe(false);
    expect(parseOrderRequest("nope").ok).toBe(false);
  });

  it("rejects a missing/invalid requestId", () => {
    expect(parseOrderRequest({ lines: [line()], qrToken: "t" }).ok).toBe(false);
    expect(parseOrderRequest({ requestId: "not-a-uuid", lines: [line()], qrToken: "t" }).ok).toBe(false);
  });

  it("rejects an empty order", () => {
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [], qrToken: "t" });
    expect(r).toEqual({ ok: false, error: "empty_order" });
  });

  it("rejects too many lines", () => {
    const lines = Array.from({ length: MAX_ORDER_LINES + 1 }, () => line());
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines, qrToken: "t" });
    expect(r).toEqual({ ok: false, error: "too_many_lines" });
  });

  it("rejects invalid quantities", () => {
    for (const quantity of [0, -1, 1.5, 9999]) {
      const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [line({ quantity })], qrToken: "t" });
      expect(r).toEqual({ ok: false, error: "invalid_quantity" });
    }
  });

  it("rejects a malformed item id", () => {
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [line({ itemId: "x" })], qrToken: "t" });
    expect(r.ok).toBe(false);
  });

  it("accepts a valid dine-in order and carries no price field", () => {
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [line({ optionIds: [OPTION_ID], price: 999999 })], qrToken: "tok" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.mode).toBe("dine_in");
      // Any client-sent price is dropped — the parsed line has no such field.
      expect(r.value.lines[0]).not.toHaveProperty("price");
      expect(r.value.lines[0].optionIds).toEqual([OPTION_ID]);
    }
  });

  it("de-dupes repeated option ids", () => {
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [line({ optionIds: [OPTION_ID, OPTION_ID] })], qrToken: "t" });
    if (r.ok) expect(r.value.lines[0].optionIds).toEqual([OPTION_ID]);
  });

  it("rejects malformed option ids", () => {
    const r = parseOrderRequest({ requestId: REQUEST_ID, lines: [line({ optionIds: ["nope"] })], qrToken: "t" });
    expect(r).toEqual({ ok: false, error: "invalid_options" });
  });

  it("requires name and phone for delivery", () => {
    const base = { requestId: REQUEST_ID, lines: [line()], slug: "s", type: "delivery" };
    expect(parseOrderRequest({ ...base, customer: {} })).toEqual({ ok: false, error: "needs_name" });
    expect(parseOrderRequest({ ...base, customer: { name: "A" } })).toEqual({ ok: false, error: "needs_phone" });
  });

  it("requires a pin OR a landmark for delivery, never blocking on GPS", () => {
    const base = { requestId: REQUEST_ID, lines: [line()], slug: "s", type: "delivery" };
    // neither → rejected
    expect(parseOrderRequest({ ...base, customer: { name: "A", phone: "07701234567" } })).toEqual({
      ok: false,
      error: "needs_location",
    });
    // landmark alone → accepted (no GPS)
    const r = parseOrderRequest({ ...base, customer: { name: "A", phone: "07701234567", landmark: "near the pharmacy" } });
    expect(r.ok).toBe(true);
  });

  it("drops a pickup order's location even if the browser sent one", () => {
    const r = parseOrderRequest({
      requestId: REQUEST_ID,
      lines: [line()],
      slug: "s",
      type: "pickup",
      customer: { name: "A", phone: "07701234567", lat: 31.99, lng: 44.31 },
    });
    if (r.ok && r.value.mode === "pickup") {
      expect(r.value.customer.lat).toBeNull();
      expect(r.value.customer.lng).toBeNull();
    }
  });
});
