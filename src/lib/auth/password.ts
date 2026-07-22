/**
 * Password rules and the strength score behind the meter (AUTH_UI_SPEC §5).
 *
 * Pure and shared so the signup and reset forms show the same meter and the
 * server can enforce the same minimum. The score is a coarse 0–4 hint, not a
 * security guarantee — Supabase hashes the password; we never log it.
 */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(pw: string): {
  score: PasswordScore;
  tooShort: boolean;
} {
  const tooShort = pw.length < MIN_PASSWORD_LENGTH;

  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  // Below the minimum can never read better than "weak", however varied.
  const clamped = Math.min(4, score);
  return {
    score: (tooShort ? Math.min(clamped, 1) : clamped) as PasswordScore,
    tooShort,
  };
}

/** Meter label bucket: score 0–1 weak, 2 fair, 3 good, 4 strong. */
export function strengthKey(score: PasswordScore): "weak" | "fair" | "good" | "strong" {
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "good";
  return "strong";
}
