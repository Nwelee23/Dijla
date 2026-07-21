/**
 * Opening hours live in `restaurants.settings` (jsonb) rather than in columns:
 * the shape is likely to grow (ramadan hours, split shifts, per-branch times)
 * and each change would otherwise be a migration.
 */

export type DayHours = {
  closed: boolean;
  /** "HH:MM", 24-hour. */
  open: string;
  close: string;
};

/** Saturday first — the Iraqi working week. */
export const DAYS = [
  { key: "sat", label: "السبت" },
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الاثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];
export type OpeningHours = Record<DayKey, DayHours>;

const DEFAULT_DAY: DayHours = { closed: false, open: "10:00", close: "23:00" };

export function defaultHours(): OpeningHours {
  return Object.fromEntries(
    DAYS.map((day) => [day.key, { ...DEFAULT_DAY }])
  ) as OpeningHours;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Reads hours out of the settings blob, filling in anything missing.
 *
 * The column is free-form jsonb that older rows never wrote, so this must cope
 * with null, a partial object, or values of the wrong type rather than trusting
 * the shape.
 */
export function parseHours(settings: unknown): OpeningHours {
  const hours = defaultHours();

  if (!settings || typeof settings !== "object") return hours;
  const raw = (settings as Record<string, unknown>).hours;
  if (!raw || typeof raw !== "object") return hours;

  for (const day of DAYS) {
    const value = (raw as Record<string, unknown>)[day.key];
    if (!value || typeof value !== "object") continue;

    const candidate = value as Partial<DayHours>;
    hours[day.key] = {
      closed: candidate.closed === true,
      open:
        typeof candidate.open === "string" && TIME_PATTERN.test(candidate.open)
          ? candidate.open
          : DEFAULT_DAY.open,
      close:
        typeof candidate.close === "string" && TIME_PATTERN.test(candidate.close)
          ? candidate.close
          : DEFAULT_DAY.close,
    };
  }

  return hours;
}

/** Rejects anything the UI shouldn't have been able to produce. */
export function validateHours(hours: OpeningHours): string | null {
  for (const day of DAYS) {
    const value = hours[day.key];
    if (!value) return `أوقات ${day.label} غير مكتملة.`;
    if (value.closed) continue;

    if (!TIME_PATTERN.test(value.open) || !TIME_PATTERN.test(value.close)) {
      return `صيغة الوقت في ${day.label} غير صحيحة.`;
    }
  }
  return null;
}

/** True when close is earlier than open, i.e. the shift runs past midnight. */
export function crossesMidnight(day: DayHours) {
  return !day.closed && day.close <= day.open;
}
