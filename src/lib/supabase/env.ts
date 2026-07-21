/**
 * Env access for Supabase.
 *
 * `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so they
 * must be referenced as full literals (not `process.env[name]`) for Next to replace them.
 * The service_role key is deliberately NOT here — see `serviceRoleKey()` in `admin.ts`,
 * which is server-only.
 */

/** Values shipped in .env.example — reaching Supabase with these can never work. */
const PLACEHOLDERS = [
  "your-project-ref",
  "your-anon-key",
  "your-service-role-key",
  "sb_publishable_...",
  "sb_secret_...",
];

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }

  if (PLACEHOLDERS.some((placeholder) => value.includes(placeholder))) {
    throw new Error(
      `${name} still holds the placeholder from .env.example. Put the real value from the Supabase dashboard in .env.local and save the file.`
    );
  }

  return value.trim();
}

/**
 * The project origin only — e.g. `https://abc.supabase.co`.
 *
 * The dashboard also displays the REST endpoint (`.../rest/v1/`), and pasting that
 * by mistake makes every request resolve to `/rest/v1//rest/v1/...`, which fails with
 * an opaque PGRST125. Strip any path so either value works.
 */
export function supabaseUrl(): string {
  const raw = required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL"
  );

  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${raw}". Expected https://<project-ref>.supabase.co`
    );
  }
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}
