import { describe, expect, it } from "vitest";

import { resolveMenuLayout } from "@/lib/menu-layout";
import type { MenuCategory } from "@/lib/menu";

function menu(withPhoto: number, without: number): MenuCategory[] {
  const item = (i: number, photo: boolean) => ({
    id: String(i),
    name: `item ${i}`,
    description: null,
    nameEn: null,
    descriptionEn: null,
    nameFa: null,
    descriptionFa: null,
    price: 1000,
    imageUrl: photo ? "https://x/y.jpg" : null,
    optionGroups: [],
    tags: [],
    prepMinutes: null,
    isAvailable: true,
  });
  const items = [
    ...Array.from({ length: withPhoto }, (_, i) => item(i, true)),
    ...Array.from({ length: without }, (_, i) => item(100 + i, false)),
  ];
  return [{ id: "c", name: "cat", items }];
}

describe("resolveMenuLayout", () => {
  it("passes an explicit choice through", () => {
    expect(resolveMenuLayout("grid", menu(0, 5))).toBe("grid");
    expect(resolveMenuLayout("list", menu(5, 0))).toBe("list");
    expect(resolveMenuLayout("featured", menu(1, 1))).toBe("featured");
  });

  it("auto picks grid when at least half the items have photos", () => {
    expect(resolveMenuLayout("auto", menu(3, 2))).toBe("grid");
    expect(resolveMenuLayout("auto", menu(1, 1))).toBe("grid");
  });

  it("auto falls back to the compact list when photos are sparse", () => {
    expect(resolveMenuLayout("auto", menu(1, 4))).toBe("list");
    expect(resolveMenuLayout("auto", menu(0, 3))).toBe("list");
  });

  it("treats an empty menu and unknown values as list / auto", () => {
    expect(resolveMenuLayout("auto", [])).toBe("list");
    expect(resolveMenuLayout(null, menu(0, 2))).toBe("list");
  });
});
