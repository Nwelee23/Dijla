/**
 * Plain-language report insights (UX_IMPROVEMENTS_SPEC §B.2) and the period
 * comparison used on the KPI tiles (§B.1). Pure and unit-tested; the page turns
 * each Insight into a localized sentence and only ever shows what the numbers
 * support.
 */

export type Insight =
  | { kind: "peak"; start: number; end: number; pct: number }
  | { kind: "topItem"; name: string; count: number }
  | { kind: "orderUp"; pct: number }
  | { kind: "orderDown"; pct: number }
  | { kind: "deliveryShare"; pct: number };

export type InsightsInput = {
  totalOrders: number;
  prevOrders: number;
  hourly: { hour: number; count: number }[];
  topItem: { name: string; count: number } | null;
  deliveryCount: number;
};

/**
 * Signed change vs the previous equivalent period. Returns null when there is no
 * baseline (previous = 0), so a tile never shows an infinite percentage (§B.1).
 */
export function percentChange(
  current: number,
  previous: number
): { pct: number; dir: "up" | "down" | "flat" } | null {
  if (previous === 0) return null;
  const raw = ((current - previous) / previous) * 100;
  const pct = Math.round(Math.abs(raw));
  if (pct === 0) return { pct: 0, dir: "flat" };
  return { pct, dir: raw > 0 ? "up" : "down" };
}

/** Up to four insights, most important first, each only when the data backs it. */
export function selectInsights(input: InsightsInput): Insight[] {
  const { totalOrders, prevOrders } = input;
  const out: Insight[] = [];

  // Order growth vs the previous period.
  if (prevOrders > 0 && totalOrders >= 5) {
    const raw = ((totalOrders - prevOrders) / prevOrders) * 100;
    const pct = Math.round(Math.abs(raw));
    if (pct >= 10) out.push(raw > 0 ? { kind: "orderUp", pct } : { kind: "orderDown", pct });
  }

  // Busiest three-hour window and its share of orders.
  if (totalOrders >= 10 && input.hourly.length > 0) {
    const counts = new Array(24).fill(0) as number[];
    for (const row of input.hourly) {
      if (row.hour >= 0 && row.hour < 24) counts[row.hour] += row.count;
    }
    let bestStart = 0;
    let bestSum = -1;
    for (let start = 0; start <= 21; start += 1) {
      const sum = counts[start] + counts[start + 1] + counts[start + 2];
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = start;
      }
    }
    const pct = Math.round((bestSum / totalOrders) * 100);
    if (pct >= 25) out.push({ kind: "peak", start: bestStart, end: bestStart + 2, pct });
  }

  // Best-selling item.
  if (input.topItem && input.topItem.count >= 3) {
    out.push({ kind: "topItem", name: input.topItem.name, count: input.topItem.count });
  }

  // Delivery's share of orders.
  if (totalOrders >= 10) {
    const pct = Math.round((input.deliveryCount / totalOrders) * 100);
    if (pct >= 20) out.push({ kind: "deliveryShare", pct });
  }

  return out.slice(0, 4);
}
