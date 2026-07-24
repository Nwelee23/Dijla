import { describe, expect, it } from "vitest";

import { haversineKm } from "@/lib/haversine";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 32.0, lng: 44.3 }, { lat: 32.0, lng: 44.3 })).toBe(0);
  });

  it("is ~111 km for one degree of latitude", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("orders two Najaf points by nearness", () => {
    const shop = { lat: 32.0, lng: 44.34 };
    const near = haversineKm(shop, { lat: 32.01, lng: 44.35 });
    const far = haversineKm(shop, { lat: 32.06, lng: 44.4 });
    expect(near).toBeLessThan(far);
  });
});
