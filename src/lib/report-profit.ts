/**
 * Item profitability (UX_IMPROVEMENTS_SPEC §B.5). Joins the sold-item totals to
 * each item's cost (by name — the top-items RPC carries no id) and ranks by
 * total profit, not revenue: the best seller is often not the best earner. Items
 * with no cost set are excluded and counted, so the page can nudge for costs.
 * Pure and unit-tested. Cost never leaves the dashboard.
 */

export type TopItem = { name: string; quantity: number; revenue: number };

export type ProfitRow = {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Whole-percent margin (profit / revenue). */
  margin: number;
};

export function itemProfit(
  items: TopItem[],
  costByName: Map<string, number>
): { rows: ProfitRow[]; missing: number } {
  const rows: ProfitRow[] = [];
  let missing = 0;

  for (const item of items) {
    const unitCost = costByName.get(item.name);
    if (unitCost == null) {
      missing += 1;
      continue;
    }
    const quantity = Number(item.quantity);
    const revenue = Number(item.revenue);
    const cost = unitCost * quantity;
    const profit = revenue - cost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    rows.push({ name: item.name, quantity, revenue, cost, profit, margin });
  }

  rows.sort((a, b) => b.profit - a.profit);
  return { rows, missing };
}
