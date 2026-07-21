-- Dijla — 30-day trial on signup (task 2.8)

-- ---------------------------------------------------------------------------
-- 1. Every new restaurant starts a trial, in the same transaction
-- ---------------------------------------------------------------------------
-- Folded into create_restaurant_with_owner rather than added as a second call
-- from the app: a restaurant that exists with no subscription row is a customer
-- who is either billed for nothing or served for free, and which one depends on
-- how the code happens to read the missing row later.
create or replace function public.create_restaurant_with_owner(
  p_name      text,
  p_slug      text,
  p_phone     text default null,
  p_area      text default null,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_restaurant uuid;
  v_slug       text;
  v_suffix     int := 1;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'restaurant name is required' using errcode = '22023';
  end if;

  if exists (select 1 from profiles where id = v_user) then
    raise exception 'this account already belongs to a restaurant'
      using errcode = '23505';
  end if;

  v_slug := coalesce(nullif(btrim(p_slug), ''), 'restaurant');
  while exists (select 1 from restaurants where slug = v_slug) loop
    v_slug := btrim(p_slug) || '-' || v_suffix;
    v_suffix := v_suffix + 1;
  end loop;

  insert into restaurants (name, slug, phone, area)
  values (btrim(p_name), v_slug, nullif(btrim(p_phone), ''), nullif(btrim(p_area), ''))
  returning id into v_restaurant;

  insert into profiles (id, restaurant_id, full_name, phone, role)
  values (
    v_user,
    v_restaurant,
    nullif(btrim(p_full_name), ''),
    nullif(btrim(p_phone), ''),
    'owner'
  );

  insert into subscriptions (restaurant_id, tier, status, start_date, end_date)
  values (v_restaurant, 'basic', 'trial', current_date, current_date + 30);

  return v_restaurant;
end;
$$;

revoke all on function public.create_restaurant_with_owner(text, text, text, text, text) from public;
grant execute on function public.create_restaurant_with_owner(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Backfill
-- ---------------------------------------------------------------------------
-- Restaurants onboarded before this migration have no row. Their trial is dated
-- from when they actually signed up, not from today — otherwise deploying this
-- would silently hand every existing restaurant a fresh 30 free days.
insert into subscriptions (restaurant_id, tier, status, start_date, end_date)
select
  r.id,
  'basic',
  'trial',
  r.created_at::date,
  r.created_at::date + 30
from restaurants r
where not exists (
  select 1 from subscriptions s where s.restaurant_id = r.id
);

-- One subscription per restaurant. Without this, a second row created by a
-- retry or a future admin tool would make "is this restaurant paid?" depend on
-- which row happened to be read.
create unique index if not exists subscriptions_restaurant_key
  on subscriptions (restaurant_id);
