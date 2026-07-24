/**
 * Monthly series for the admin growth charts (UX_IMPROVEMENTS_SPEC §A.1, §A.2),
 * derived from the per-restaurant admin list — no extra RPC needed. Pure and
 * unit-tested. MRR is an approximation from each subscription's start/end/amount
 * (good enough for a founder's trend line, not an accounting figure).
 */

export type AdminChartRow = {
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  status: string;
};

export type MonthPoint = { month: string; value: number };

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** The last `count` months (oldest first), each as a [start, end] ms window. */
function lastMonths(
  count: number,
  now: Date
): { key: string; start: number; end: number }[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const out: { key: string; start: number; end: number }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = Date.UTC(year, month - i, 1);
    const end = Date.UTC(year, month - i + 1, 1) - 1;
    const d = new Date(start);
    out.push({ key: monthKey(d.getUTCFullYear(), d.getUTCMonth()), start, end });
  }
  return out;
}

/** New restaurants created in each of the last `count` months. */
export function newRestaurantsPerMonth(
  rows: AdminChartRow[],
  count = 12,
  now = new Date()
): MonthPoint[] {
  return lastMonths(count, now).map((mo) => ({
    month: mo.key,
    value: rows.filter((r) => {
      const t = Date.parse(r.created_at);
      return Number.isFinite(t) && t >= mo.start && t <= mo.end;
    }).length,
  }));
}

/** Total restaurants in existence at each month end (true cumulative). */
export function cumulativeRestaurantsPerMonth(
  rows: AdminChartRow[],
  count = 12,
  now = new Date()
): MonthPoint[] {
  return lastMonths(count, now).map((mo) => ({
    month: mo.key,
    value: rows.filter((r) => {
      const t = Date.parse(r.created_at);
      return Number.isFinite(t) && t <= mo.end;
    }).length,
  }));
}

/** Approximate MRR (sum of paying subscription amounts) active in each month. */
export function mrrPerMonth(
  rows: AdminChartRow[],
  count = 12,
  now = new Date()
): MonthPoint[] {
  return lastMonths(count, now).map((mo) => ({
    month: mo.key,
    value: rows.reduce((sum, r) => {
      const amount = Number(r.amount ?? 0);
      if (amount <= 0 || !r.start_date) return sum;
      const start = Date.parse(r.start_date);
      if (!Number.isFinite(start) || start > mo.end) return sum; // not started yet
      if (r.end_date) {
        const end = Date.parse(r.end_date);
        if (Number.isFinite(end) && end < mo.start) return sum; // already ended
      }
      return sum + amount;
    }, 0),
  }));
}
