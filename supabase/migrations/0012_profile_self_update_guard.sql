-- Dijla — stop a profile escalating itself (prerequisite for 4.6)
--
-- 4.6 has drivers toggle their own driver_status, and the brief says the
-- existing own_profile policy already allows it. It does — but it allows far
-- more. own_profile (0002) grants a user full access to their OWN row, and RLS
-- cannot narrow that to particular columns. So a driver can PATCH their own
-- role to 'owner', and is_restaurant_staff() (0011) then hands them the whole
-- tenant: every order, every customer's phone and pin, every table's qr_token.
-- The isolation 0011 exists to enforce is undone by one self-update.
--
-- Verified exploitable before writing this: signed in as a driver,
--   update profiles set role = 'owner' where id = <self>
-- succeeded, and the row came back with role 'owner'.
--
-- A trigger draws the column line RLS cannot. role, restaurant_id and is_active
-- are identity and standing — they may be set only by the trusted server paths
-- that already own them (onboarding's SECURITY DEFINER function, and the
-- driver-management actions running as service_role), never by the user editing
-- their own row. Those trusted paths have no auth.uid(); a user session does,
-- and that is exactly how the trigger tells them apart. What is genuinely the
-- user's own to change — driver_status, name, phone — is left alone.

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No auth.uid() means service_role or a SECURITY DEFINER path — the trusted
  -- writers of these columns. They may set anything.
  if auth.uid() is null then
    return new;
  end if;

  -- A real user session is editing a profile row. The only row own_profile lets
  -- them reach is their own, so this is a self-update: forbid the three columns
  -- that would change who they are or whether they are allowed in.
  if new.role is distinct from old.role
     or new.restaurant_id is distinct from old.restaurant_id
     or new.is_active is distinct from old.is_active then
    raise exception
      'a profile cannot change its own role, restaurant or active state'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_self_update on profiles;
create trigger guard_profile_self_update
  before update on profiles
  for each row execute function public.guard_profile_self_update();
