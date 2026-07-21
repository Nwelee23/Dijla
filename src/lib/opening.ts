import { DAYS, parseHours, type DayHours, type DayKey } from "@/lib/hours";

/**
 * Is the restaurant open right now?
 *
 * Anchored to Asia/Baghdad, never to the server's clock. Vercel runs in UTC,
 * so a restaurant open until 23:00 would be reported closed from 20:00 Baghdad
 * time — every evening, which is when Iraqi restaurants are busiest.
 */
const TIME_ZONE = "Asia/Baghdad";

/** Sunday-first, matching Date#getDay, mapped onto our Saturday-first week. */
const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Sat: "sat",
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
};

type LocalNow = { day: DayKey; minutes: number };

function nowInBaghdad(at: Date): LocalNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: WEEKDAY_TO_KEY[get("weekday")] ?? "sat",
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function previousDay(day: DayKey): DayKey {
  const index = DAYS.findIndex((entry) => entry.key === day);
  return DAYS[(index - 1 + DAYS.length) % DAYS.length].key;
}

function coversNow(shift: DayHours, minutes: number, isYesterday: boolean): boolean {
  if (shift.closed) return false;

  const open = toMinutes(shift.open);
  const close = toMinutes(shift.close);

  // A shift that ends at or before it starts runs past midnight — 18:00 to
  // 02:00. At 01:00 the restaurant is still inside *yesterday's* window, which
  // is why the previous day is checked too.
  if (close <= open) {
    return isYesterday ? minutes < close : minutes >= open;
  }

  return !isYesterday && minutes >= open && minutes < close;
}

export type OpenState = {
  isOpen: boolean;
  /** Today's hours, for telling the diner when to come back. */
  today: DayHours;
  todayKey: DayKey;
};

export function getOpenState(settings: unknown, at: Date = new Date()): OpenState {
  const hours = parseHours(settings);
  const { day, minutes } = nowInBaghdad(at);

  const today = hours[day];
  const yesterday = hours[previousDay(day)];

  return {
    isOpen:
      coversNow(today, minutes, false) || coversNow(yesterday, minutes, true),
    today,
    todayKey: day,
  };
}
