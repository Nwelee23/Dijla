-- Dijla — verification gating (AUTH_UI_SPEC §6).
--
-- A pending restaurant can build its menu but must not take live orders until an
-- admin verifies it. The order endpoint enforces that, but there is a hole to
-- close first: tenant_restaurants (0002) is `for all`, so an owner could PATCH
-- their own restaurants row and set verification_status='verified' themselves,
-- self-approving straight past the gate. This trigger makes the verification
-- fields writable only by the platform (service_role / admin actions), with one
-- exception: an owner may resubmit a REJECTED restaurant back to pending.
--
-- Also extends admin_restaurants so the admin panel can see and act on status.
-- Idempotent.

-- ---------------------------------------------------------------------------
-- guard: verification fields are the platform's to set, not the owner's
-- ---------------------------------------------------------------------------
create or replace function public.guard_restaurant_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.verification_note is distinct from old.verification_note then

    -- Trusted path: service_role has no auth.uid() (admin actions, migrations).
    if auth.uid() is null then
      return new;
    end if;

    -- Owner self-service: resubmit a rejected restaurant, and ONLY that — flip
    -- the status back to pending, touching neither verified_at nor the note, and
    -- never setting 'verified'. Everything else is the platform's decision.
    if old.verification_status = 'rejected'
       and new.verification_status = 'pending'
       and new.verified_at is not distinct from old.verified_at
       and new.verification_note is not distinct from old.verification_note then
      return new;
    end if;

    raise exception 'verification status is managed by the platform'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_restaurant_verification on restaurants;
create trigger guard_restaurant_verification
  before update on restaurants
  for each row execute function public.guard_restaurant_verification();

-- Grandfather restaurants that onboarded before verification existed: 0021
-- defaulted every row to 'pending', but these were already live, so freezing
-- their orders would be a regression. Mark them verified. New signups from the
-- wizard start pending and wait for an admin. (auth.uid() is null here, so the
-- guard trigger above allows this platform-side update.)
update restaurants
  set verification_status = 'verified', verified_at = now()
  where verification_status = 'pending';

-- ---------------------------------------------------------------------------
-- admin_restaurants: carry verification status + note
-- ---------------------------------------------------------------------------
drop function if exists public.admin_restaurants();
create function public.admin_restaurants()
returns table (
  id                  uuid,
  name                text,
  slug                text,
  is_active           boolean,
  created_at          timestamptz,
  verification_status text,
  verification_note   text,
  tier                text,
  status              text,
  amount              numeric,
  start_date          date,
  end_date            date,
  order_count         bigint,
  last_order_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.name, r.slug, r.is_active, r.created_at,
    r.verification_status, r.verification_note,
    s.tier, s.status, s.amount, s.start_date, s.end_date,
    count(o.id), max(o.created_at)
  from restaurants r
  left join subscriptions s on s.restaurant_id = r.id
  left join orders o on o.restaurant_id = r.id
  where is_platform_admin()
  group by r.id, r.name, r.slug, r.is_active, r.created_at,
           r.verification_status, r.verification_note,
           s.tier, s.status, s.amount, s.start_date, s.end_date
  order by r.created_at desc;
$$;

revoke all on function public.admin_restaurants() from public, anon;
grant execute on function public.admin_restaurants() to authenticated;
