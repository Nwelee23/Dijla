import { describe, expect, it } from "vitest";

import { buildChurnRows } from "@/lib/churn";

const NOW = Date.parse("2026-03-15T00:00:00Z");

const dormant = [
  { restaurant_id: "a", name: "A", area: "نجف", phone: "07", days_dormant: 20, lifetime_orders: 50 },
  { restaurant_id: "b", name: "B", area: null, phone: null, days_dormant: 8, lifetime_orders: 3 },
  { restaurant_id: "new", name: "New", area: null, phone: null, days_dormant: 999, lifetime_orders: 0 },
  { restaurant_id: "gone", name: "Gone", area: null, phone: null, days_dormant: 30, lifetime_orders: 10 },
];
const restaurants = [
  { id: "a", created_at: "2025-06-01", status: "active", tier: "pro" },
  { id: "b", created_at: "2025-12-01", status: "active", tier: "basic" },
  { id: "new", created_at: "2026-03-12", status: "trial", tier: "basic" }, // still first week
  { id: "gone", created_at: "2025-01-01", status: "cancelled", tier: "pro" },
];
const outreach = [
  { restaurant_id: "a", created_at: "2026-03-10T00:00:00Z" },
  { restaurant_id: "a", created_at: "2026-02-01T00:00:00Z" },
];

describe("buildChurnRows", () => {
  it("excludes first-week and cancelled, sorts by days dormant", () => {
    const rows = buildChurnRows(dormant, restaurants, outreach, NOW);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("keeps the latest outreach per restaurant", () => {
    const rows = buildChurnRows(dormant, restaurants, outreach, NOW);
    expect(rows[0].lastOutreachAt).toBe("2026-03-10T00:00:00Z");
    expect(rows[1].lastOutreachAt).toBeNull();
  });
});
