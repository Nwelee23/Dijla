import { describe, expect, it } from "vitest";

import {
  cumulativeRestaurantsPerMonth,
  mrrPerMonth,
  newRestaurantsPerMonth,
  type AdminChartRow,
} from "@/lib/admin-charts";

// Fixed "now" = 2026-03-15 so the windows are deterministic.
const NOW = new Date("2026-03-15T12:00:00Z");

const rows: AdminChartRow[] = [
  // Jan 2026: one paying restaurant, still active.
  { created_at: "2026-01-10", start_date: "2026-01-10", end_date: null, amount: 25000, status: "active" },
  // Feb 2026: one paying, cancelled end of Feb.
  { created_at: "2026-02-05", start_date: "2026-02-05", end_date: "2026-02-28", amount: 45000, status: "cancelled" },
  // Mar 2026: a trial (amount 0) — never counts toward MRR.
  { created_at: "2026-03-01", start_date: "2026-03-01", end_date: null, amount: 0, status: "trialing" },
];

describe("newRestaurantsPerMonth", () => {
  it("counts sign-ups in each of the last months", () => {
    const series = newRestaurantsPerMonth(rows, 3, NOW);
    expect(series.map((p) => [p.month, p.value])).toEqual([
      ["2026-01", 1],
      ["2026-02", 1],
      ["2026-03", 1],
    ]);
  });
});

describe("cumulativeRestaurantsPerMonth", () => {
  it("accumulates the total in existence at each month end", () => {
    const series = cumulativeRestaurantsPerMonth(rows, 3, NOW);
    expect(series.map((p) => p.value)).toEqual([1, 2, 3]);
  });
});

describe("mrrPerMonth", () => {
  it("sums active paid subscriptions, ignoring trials and ended ones", () => {
    const series = mrrPerMonth(rows, 3, NOW);
    // Jan: only the 25,000 sub. Feb: 25,000 + 45,000. Mar: the 45,000 ended in
    // Feb and the trial is 0, so only the 25,000 remains.
    expect(series.map((p) => p.value)).toEqual([25000, 70000, 25000]);
  });
});
