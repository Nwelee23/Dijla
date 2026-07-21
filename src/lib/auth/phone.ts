/**
 * Iraqi phone numbers for Supabase Auth.
 *
 * Supabase requires E.164 (`+9647XXXXXXXXX`), but people type the local form
 * (`07XX XXX XXXX`). Normalise before sending an OTP, otherwise the same person
 * signing in two different ways becomes two different accounts.
 */

const IRAQ_COUNTRY_CODE = "964";

/** `0770 123 4567` / `+964 770 123 4567` / `9647701234567` -> `+9647701234567` */
export function normalizeIraqiPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  // Local form: leading 0, then a 10-digit mobile number starting with 7.
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "7") {
    return `+${IRAQ_COUNTRY_CODE}${digits.slice(1)}`;
  }

  // Already international, with or without the +.
  if (digits.startsWith(IRAQ_COUNTRY_CODE) && digits.length === 13) {
    return `+${digits}`;
  }

  // Bare mobile number without the leading 0.
  if (digits.startsWith("7") && digits.length === 10) {
    return `+${IRAQ_COUNTRY_CODE}${digits}`;
  }

  return null;
}

/** `+9647701234567` -> `0770 123 4567`, for display in an Arabic UI. */
export function formatIraqiPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (!digits.startsWith(IRAQ_COUNTRY_CODE)) return e164;

  const local = `0${digits.slice(IRAQ_COUNTRY_CODE.length)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`.trim();
}
