/**
 * Elapsed-time accountability for the live board (ORDERS_DASHBOARD_SPEC §3).
 *
 * The timer is the highest-value element on the orders screen: every active
 * order shows how long it has been waiting, turning warning then danger past
 * per-restaurant thresholds, so the kitchen polices itself without the owner
 * standing over it. Pure and shared so the display and any test agree.
 */
export const DEFAULT_WARN_MINUTES = 15;
export const DEFAULT_DANGER_MINUTES = 25;

export type PrepThresholds = { warnMinutes: number; dangerMinutes: number };
export type TimerLevel = "normal" | "warning" | "danger";

/**
 * Read the thresholds from the restaurant's `settings` jsonb, falling back to
 * the defaults and repairing nonsense (non-positive, or danger below warn) so a
 * bad settings write can never make the board misread urgency.
 */
export function readPrepThresholds(settings: unknown): PrepThresholds {
  const prep =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>).prep
      : null;
  const raw = prep && typeof prep === "object" ? (prep as Record<string, unknown>) : {};

  const warn = toPositiveInt(raw.warnMinutes, DEFAULT_WARN_MINUTES);
  let danger = toPositiveInt(raw.dangerMinutes, DEFAULT_DANGER_MINUTES);
  if (danger <= warn) danger = warn + 1;

  return { warnMinutes: warn, dangerMinutes: danger };
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Whole seconds since the order was placed (never negative). */
export function elapsedSeconds(createdAt: string | null, now: number = Date.now()): number {
  if (!createdAt) return 0;
  const ms = now - new Date(createdAt).getTime();
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

export function timerLevel(
  seconds: number,
  { warnMinutes, dangerMinutes }: PrepThresholds
): TimerLevel {
  const minutes = seconds / 60;
  if (minutes >= dangerMinutes) return "danger";
  if (minutes >= warnMinutes) return "warning";
  return "normal";
}

/** A stopwatch reading: MM:SS, or H:MM:SS once past an hour. LTR, tabular. */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
