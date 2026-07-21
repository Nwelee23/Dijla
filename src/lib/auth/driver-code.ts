import "server-only";

/**
 * Driver login without SMS.
 *
 * Phone OTP is dormant on this project — it needs a paid SMS provider, and the
 * dashboard's own auth config has `external_phone_enabled: false`. Drivers are
 * also the least likely of anyone to have an email they check on the job. So a
 * driver does not sign themselves up at all: the restaurant registers them, and
 * the server mints a Supabase account for them behind a synthetic email, with a
 * short code the owner reads out as the password.
 *
 * The email never leaves the server and nothing is ever sent to it — the account
 * is created already-confirmed through the admin API. It exists only so Supabase
 * Auth, which is email-or-phone, has an identity to hang the session on. The
 * phone the driver types is mapped to it deterministically.
 */

const DRIVER_EMAIL_DOMAIN = "drivers.dijla.app";

/**
 * The synthetic email for a driver's E.164 phone. Deterministic, so the login
 * screen can turn the phone the driver types back into the same address the
 * account was created under. Not a real inbox — see the file header.
 */
export function driverEmailForPhone(e164Phone: string): string {
  const digits = e164Phone.replace(/\D/g, "");
  return `d${digits}@${DRIVER_EMAIL_DOMAIN}`;
}

// No O/0, I/1/L: a code read aloud across a noisy kitchen must not hinge on
// telling those apart.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A standing login code. Eight characters from an unambiguous alphabet is
 * ~8.5e11 combinations — this is a password, not an expiring OTP, so it has to
 * survive being guessed for as long as the driver works here, and 6 digits
 * (1e6) would not.
 */
export function generateDriverCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}
