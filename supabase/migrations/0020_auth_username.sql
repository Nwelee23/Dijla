-- Dijla — usernames for daily sign-in (AUTH_UI_SPEC §2, §5).
--
-- Daily login moves to username + password. Supabase password auth is still
-- keyed by the account email underneath (resolved server-side, never shown), so
-- this only needs a username to look that account up by. Nullable on purpose:
-- existing accounts have none yet and keep signing in by email until they set
-- one, so nobody is locked out the moment this lands.
--
-- Idempotent — every statement guards itself so the whole file re-runs cleanly.

alter table profiles
  add column if not exists username text;

-- Case-insensitive uniqueness: "AlFurat" and "alfurat" are the same handle.
create unique index if not exists profiles_username_lower_key
  on profiles (lower(username));

-- Charset/length per §5: latin letters, digits and underscore, 4–20 chars,
-- lowercase. The app lowercases before writing; this is the backstop. NULL is
-- allowed (a CHECK passes on NULL) so pre-existing rows stay valid.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format'
  ) then
    alter table profiles
      add constraint profiles_username_format
      check (username is null or username ~ '^[a-z0-9_]{4,20}$');
  end if;
end $$;

comment on column profiles.username is
  'Daily-login handle (AUTH_UI_SPEC §5): lowercase [a-z0-9_], 4-20 chars, unique
   case-insensitively. Resolved to the account email server-side at sign-in.';
