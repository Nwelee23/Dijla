import { describe, expect, it } from "vitest";

import { itemProfit } from "@/lib/report-profit";

const items = [
  { name: "كباب", quantity: 10, revenue: 120000 }, // cost 8000 → profit 40,000
  { name: "عصير", quantity: 20, revenue: 80000 }, // cost 1000 → profit 60,000
  { name: "تشريب", quantity: 5, revenue: 40000 }, // no cost → excluded
];
const costs = new Map<string, number>([
  ["كباب", 8000],
  ["عصير", 1000],
]);

describe("itemProfit", () => {
  it("computes profit + margin and drops items with no cost", () => {
    const { rows, missing } = itemProfit(items, costs);
    expect(missing).toBe(1);
    const kebab = rows.find((r) => r.name === "كباب")!;
    expect(kebab.profit).toBe(120000 - 8000 * 10); // 40,000
    expect(kebab.margin).toBe(33); // round(40000/120000 * 100)
    const juice = rows.find((r) => r.name === "عصير")!;
    expect(juice.profit).toBe(80000 - 1000 * 20); // 60,000
    expect(juice.margin).toBe(75);
  });

  it("ranks by total profit, not revenue — juice out-earns the pricier kebab", () => {
    const { rows } = itemProfit(items, costs);
    expect(rows.map((r) => r.name)).toEqual(["عصير", "كباب"]);
  });
});
