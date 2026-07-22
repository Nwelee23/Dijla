/**
 * Date ranges for the reports page, anchored to Asia/Baghdad.
 *
 * A day boundary is a wall-clock thing — "today's sales" means since midnight in
 * Najaf, not since midnight UTC. Iraq abolished daylight saving in 2008, so the
 * offset is a constant +03:00; no zone table needed, just the offset, which
 * keeps the maths honest and the boundaries exact.
 */

const OFFSET = "+03:00";

export type RangeKey = "today" | "7d" | "30d" | "custom";

export const RANGE_KEYS: RangeKey[] = ["today", "7d", "30d", "custom"];

export type ResolvedRange = {
  key: RangeKey;
  /** UTC instants for the query bounds: [from, to). */
  from: string;
  to: string;
  /** The Baghdad calendar days the picker shows and round-trips. */
  fromDate: string;
  toDate: string;
};

/** Today's date (YYYY-MM-DD) as it reads on a clock in Baghdad. */
function baghdadToday(now: Date): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we round-trip.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Shift a YYYY-MM-DD by whole days, staying on calendar dates (no zone drift). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

const isDate = (value: string | undefined): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Midnight of a Baghdad calendar day, as the UTC instant the query wants. */
const startOf = (date: string) => `${date}T00:00:00${OFFSET}`;

/**
 * Turn a picker choice into query bounds. `to` is exclusive and always the
 * start of the day after the last included day, so "today" covers the whole of
 * today and a custom range includes both endpoints.
 */
export function resolveRange(
  key: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
  now: Date = new Date()
): ResolvedRange {
  const today = baghdadToday(now);

  if (key === "custom" && isDate(fromDate) && isDate(toDate)) {
    // Guard against a reversed range: swap rather than return nothing.
    const [lo, hi] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    return {
      key: "custom",
      from: startOf(lo),
      to: startOf(addDays(hi, 1)),
      fromDate: lo,
      toDate: hi,
    };
  }

  const resolvedKey: RangeKey = key === "7d" || key === "30d" ? key : "today";
  const back = resolvedKey === "30d" ? 29 : resolvedKey === "7d" ? 6 : 0;
  const from = addDays(today, -back);

  return {
    key: resolvedKey,
    from: startOf(from),
    to: startOf(addDays(today, 1)),
    fromDate: from,
    toDate: today,
  };
}
