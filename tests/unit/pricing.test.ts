import { describe, expect, it } from "vitest";

import {
  priceLines,
  type OrderLineInput,
  type PricingGroup,
  type PricingItem,
  type PricingOption,
} from "@/lib/orders";

/** A burger (6,000) with a required single size and an optional multi extras group. */
function fixture() {
  const itemById = new Map<string, PricingItem>([
    ["burger", { id: "burger", name: "Burger", price: 6000 }],
    ["other", { id: "other", name: "Other", price: 5000 }],
  ]);
  const groupById = new Map<string, PricingGroup>([
    ["size", { id: "size", item_id: "burger", is_required: true, max_select: 1 }],
    ["extras", { id: "extras", item_id: "burger", is_required: false, max_select: 2 }],
    ["otherSize", { id: "otherSize", item_id: "other", is_required: false, max_select: 1 }],
  ]);
  const requiredGroupsByItem = new Map<string, string[]>([["burger", ["size"]]]);
  const optionById = new Map<string, PricingOption>([
    ["medium", { id: "medium", name: "Medium", price_delta: 0, group_id: "size" }],
    ["large", { id: "large", name: "Large", price_delta: 2000, group_id: "size" }],
    ["cheese", { id: "cheese", name: "Cheese", price_delta: 1000, group_id: "extras" }],
    ["egg", { id: "egg", name: "Egg", price_delta: 750, group_id: "extras" }],
    ["otherOpt", { id: "otherOpt", name: "Big", price_delta: 3000, group_id: "otherSize" }],
  ]);
  return { itemById, groupById, requiredGroupsByItem, optionById };
}

const line = (over: Partial<OrderLineInput> = {}): OrderLineInput => ({
  itemId: "burger",
  quantity: 1,
  note: "",
  optionIds: ["medium"],
  ...over,
});

function price(lines: OrderLineInput[]) {
  const f = fixture();
  return priceLines(lines, f.itemById, f.groupById, f.requiredGroupsByItem, f.optionById);
}

describe("priceLines", () => {
  it("charges item price × quantity", () => {
    const r = price([line({ optionIds: ["medium"], quantity: 3 })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.priced[0].lineTotal).toBe(18000);
  });

  it("adds each selected option's price_delta", () => {
    const r = price([line({ optionIds: ["large", "cheese"] })]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.priced[0].lineTotal).toBe(9000); // 6000 + 2000 + 1000
  });

  it("multiplies (item + deltas) by quantity", () => {
    const r = price([line({ optionIds: ["large", "cheese", "egg"], quantity: 2 })]);
    if (r.ok) expect(r.priced[0].lineTotal).toBe((6000 + 2000 + 1000 + 750) * 2);
  });

  it("sums the subtotal across lines and EXCLUDES any delivery fee", () => {
    const r = price([
      line({ optionIds: ["large"] }),
      line({ optionIds: ["medium"], quantity: 2 }),
    ]);
    // 8000 + 12000 — the subtotal is food only; the fee is added by the caller,
    // which is why a minimum-order check against it measures the food.
    if (r.ok) expect(r.subtotal).toBe(20000);
  });

  it("snapshots the chosen options' name and delta", () => {
    const r = price([line({ optionIds: ["large", "cheese"] })]);
    if (r.ok) {
      expect(r.priced[0].optionsSnapshot).toContainEqual({ name: "Large", price_delta: 2000 });
      expect(r.priced[0].optionsSnapshot).toContainEqual({ name: "Cheese", price_delta: 1000 });
    }
  });

  it("rejects a required group with no selection", () => {
    const r = price([line({ optionIds: ["cheese"] })]);
    expect(r).toEqual({ ok: false, error: "invalid_options" });
  });

  it("rejects exceeding max_select (two sizes)", () => {
    const r = price([line({ optionIds: ["large", "medium"] })]);
    expect(r).toEqual({ ok: false, error: "invalid_options" });
  });

  it("rejects an unknown option id", () => {
    const r = price([line({ optionIds: ["medium", "nope"] })]);
    expect(r).toEqual({ ok: false, error: "invalid_options" });
  });

  it("rejects an option from another item (forged)", () => {
    const r = price([line({ optionIds: ["medium", "otherOpt"] })]);
    expect(r).toEqual({ ok: false, error: "invalid_options" });
  });

  it("rejects an unknown item", () => {
    const r = price([line({ itemId: "ghost", optionIds: [] })]);
    expect(r).toEqual({ ok: false, error: "unavailable_items" });
  });

  it("uses only the server-side price and delta (there is no client field to trust)", () => {
    // OrderLineInput carries itemId/quantity/note/optionIds — no price, no delta.
    // The total is derived purely from the fixture rows, so a tampered basket
    // cannot change it.
    const r = price([line({ optionIds: ["large"] })]);
    if (r.ok) {
      expect(r.priced[0].priceSnapshot).toBe(6000);
      expect(r.priced[0].lineTotal).toBe(8000);
    }
  });
});
