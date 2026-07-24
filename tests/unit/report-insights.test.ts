import { describe, expect, it } from "vitest";

import { percentChange, selectInsights } from "@/lib/report-insights";

describe("percentChange", () => {
  it("is a signed, rounded percentage against the previous period", () => {
    expect(percentChange(120, 100)).toEqual({ pct: 20, dir: "up" });
    expect(percentChange(80, 100)).toEqual({ pct: 20, dir: "down" });
    expect(percentChange(100, 100)).toEqual({ pct: 0, dir: "flat" });
  });

  it("returns null with no baseline (never infinity)", () => {
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("selectInsights", () => {
  const hourly = [
    { hour: 13, count: 2 },
    { hour: 19, count: 8 },
    { hour: 20, count: 10 },
    { hour: 21, count: 6 },
  ];

  it("finds the peak window, best seller, growth and delivery share", () => {
    const insights = selectInsights({
      totalOrders: 40,
      prevOrders: 30,
      hourly,
      topItem: { name: "كباب عراقي", count: 12 },
      deliveryCount: 16,
    });
    const kinds = insights.map((i) => i.kind);
    expect(kinds).toContain("orderUp");
    expect(kinds).toContain("peak");
    expect(kinds).toContain("topItem");
    expect(kinds).toContain("deliveryShare");

    const peak = insights.find((i) => i.kind === "peak");
    expect(peak).toMatchObject({ start: 19, end: 21 });
  });

  it("stays silent when the data is too thin, and caps at four", () => {
    expect(
      selectInsights({
        totalOrders: 3,
        prevOrders: 0,
        hourly: [{ hour: 20, count: 3 }],
        topItem: { name: "x", count: 1 },
        deliveryCount: 0,
      })
    ).toEqual([]);
  });

  it("reports a drop when orders fall", () => {
    const insights = selectInsights({
      totalOrders: 20,
      prevOrders: 40,
      hourly: [],
      topItem: null,
      deliveryCount: 0,
    });
    expect(insights).toEqual([{ kind: "orderDown", pct: 50 }]);
  });
});
