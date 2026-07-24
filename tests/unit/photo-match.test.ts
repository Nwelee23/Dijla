import { describe, expect, it } from "vitest";

import { matchFilesToItems, normalizeName, similarity } from "@/lib/photo-match";

describe("normalizeName", () => {
  it("drops the extension, lowercases, and folds separators", () => {
    expect(normalizeName("Kebab_Iraqi.JPG")).toBe("kebab iraqi");
    expect(normalizeName("chicken-biryani.png")).toBe("chicken biryani");
  });

  it("strips Arabic tatweel and punctuation", () => {
    expect(normalizeName("كبـاب.jpg")).toBe("كباب");
  });
});

describe("similarity", () => {
  it("is 1 for identical and high when one contains the other", () => {
    expect(similarity("كباب", "كباب")).toBe(1);
    expect(similarity("كباب", "كباب عراقي")).toBeGreaterThanOrEqual(0.8);
  });

  it("is low for unrelated strings", () => {
    expect(similarity("كباب", "عصير")).toBeLessThan(0.5);
  });
});

describe("matchFilesToItems", () => {
  const items = [
    { id: "a", name: "كباب عراقي" },
    { id: "b", name: "برياني دجاج" },
    { id: "c", name: "عصير برتقال" },
  ];

  it("matches a filename to its dish across a partial name", () => {
    expect(matchFilesToItems(["كباب.jpg"], items)).toEqual(["a"]);
    expect(matchFilesToItems(["برياني دجاج.png"], items)).toEqual(["b"]);
  });

  it("returns null when nothing clears the threshold", () => {
    expect(matchFilesToItems(["random-photo-2024.jpg"], items)).toEqual([null]);
  });

  it("keeps the input order", () => {
    expect(matchFilesToItems(["عصير.jpg", "كباب.jpg"], items)).toEqual(["c", "a"]);
  });
});
