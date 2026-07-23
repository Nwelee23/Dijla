import { describe, expect, it } from "vitest";

import { normalizeIraqiPhone } from "@/lib/auth/phone";
import { isActive, nextStatus } from "@/lib/order-status";

describe("normalizeIraqiPhone", () => {
  it("normalizes 07XXXXXXXX and 7XXXXXXXX to the same E.164", () => {
    expect(normalizeIraqiPhone("07701234567")).toBe("+9647701234567");
    expect(normalizeIraqiPhone("7701234567")).toBe("+9647701234567");
    expect(normalizeIraqiPhone("07701234567")).toBe(normalizeIraqiPhone("7701234567"));
  });

  it("accepts the international form with or without +", () => {
    expect(normalizeIraqiPhone("+9647701234567")).toBe("+9647701234567");
    expect(normalizeIraqiPhone("9647701234567")).toBe("+9647701234567");
  });

  it("ignores spaces and separators", () => {
    expect(normalizeIraqiPhone("0770 123 4567")).toBe("+9647701234567");
  });

  it("rejects clearly invalid numbers", () => {
    for (const bad of ["", "123", "0801234567", "0770123456", "077012345678"]) {
      expect(normalizeIraqiPhone(bad)).toBeNull();
    }
  });
});

describe("order status transitions", () => {
  it("advances dine-in through to delivered, then stops", () => {
    expect(nextStatus("new", "dine_in")).toBe("accepted");
    expect(nextStatus("accepted", "dine_in")).toBe("preparing");
    expect(nextStatus("preparing", "dine_in")).toBe("ready");
    expect(nextStatus("ready", "dine_in")).toBe("delivered");
    expect(nextStatus("delivered", "dine_in")).toBeNull();
  });

  it("routes delivery through out_for_delivery, but dine-in never does", () => {
    expect(nextStatus("ready", "delivery")).toBe("out_for_delivery");
    expect(nextStatus("out_for_delivery", "delivery")).toBe("delivered");
    // dine-in has no out_for_delivery step
    expect(nextStatus("ready", "dine_in")).not.toBe("out_for_delivery");
  });

  it("has no next step from a terminal status", () => {
    expect(nextStatus("delivered", "delivery")).toBeNull();
    expect(nextStatus("cancelled", "delivery")).toBeNull();
  });

  it("classifies active vs terminal statuses", () => {
    expect(isActive("new")).toBe(true);
    expect(isActive("out_for_delivery")).toBe(true);
    expect(isActive("delivered")).toBe(false);
    expect(isActive("cancelled")).toBe(false);
  });
});
