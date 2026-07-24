import { describe, expect, it } from "vitest";

import { parseMenuLine, parseMenuLines } from "@/lib/menu-lines";

describe("parseMenuLine", () => {
  it("splits a name and a trailing price", () => {
    expect(parseMenuLine("كباب عراقي 12000")).toEqual({
      name: "كباب عراقي",
      price: 12000,
    });
  });

  it("accepts Arabic-Indic and Persian digits", () => {
    expect(parseMenuLine("تشريب ٨٠٠٠")).toEqual({ name: "تشريب", price: 8000 });
    expect(parseMenuLine("برياني ۱۰۰۰۰")).toEqual({ name: "برياني", price: 10000 });
  });

  it("strips thousands separators", () => {
    expect(parseMenuLine("بيتزا 12,000")?.price).toBe(12000);
    expect(parseMenuLine("بيتزا 12.000")?.price).toBe(12000);
  });

  it("tolerates a dash or colon between name and price", () => {
    expect(parseMenuLine("شاورما - 6000")).toEqual({ name: "شاورما", price: 6000 });
    expect(parseMenuLine("عصير : 3000")).toEqual({ name: "عصير", price: 3000 });
  });

  it("keeps a number inside the name and takes the trailing one as price", () => {
    expect(parseMenuLine("بيبسي 2 لتر 2000")).toEqual({
      name: "بيبسي 2 لتر",
      price: 2000,
    });
  });

  it("rejects a line with no price, no name, or a zero price", () => {
    expect(parseMenuLine("كباب بدون سعر")).toBeNull();
    expect(parseMenuLine("12000")).toBeNull();
    expect(parseMenuLine("مجاني 0")).toBeNull();
    expect(parseMenuLine("   ")).toBeNull();
  });
});

describe("parseMenuLines", () => {
  it("collects valid rows and counts the unparsed, ignoring blanks", () => {
    const result = parseMenuLines(
      "كباب 12000\n\nتشريب 8000\nسطر بلا سعر\n   \nبرياني ١٠٠٠٠"
    );
    expect(result.valid).toEqual([
      { name: "كباب", price: 12000 },
      { name: "تشريب", price: 8000 },
      { name: "برياني", price: 10000 },
    ]);
    expect(result.invalid).toBe(1);
  });
});
