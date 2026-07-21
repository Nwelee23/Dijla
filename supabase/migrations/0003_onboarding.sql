-- Dijla — restaurant onboarding (task 1.2)
--
-- Why a function instead of two inserts from the app:
--
-- 1. Atomicity. Creating the restaurant and the owner profile must both happen
--    or neither. Two separate PostgREST calls can leave an orphan restaurant
--    with no owner, and a user who is stuck: signed in, no profile, and a
--    dangling row nobody can reach.
--
-- 2. RLS makes the two-step version fail anyway. `tenant_restaurants` grants
--    SELECT on `id = current_restaurant_id()`, which is still NULL during
--    onboarding — so `insert ... returning` cannot read back the new row, and
--    the app never learns the id it needs for `profiles.restaurant_id`.
--
-- 3. Slug uniqueness is resolved inside the same transaction, so two
--    restaurants signing up with the same name cannot collide.

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

  -- One restaurant per account. Without this, a signed-in user could call the
  -- function repeatedly and create unlimited restaurants.
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

  return v_restaurant;
end;
$$;

revoke all on function public.create_restaurant_with_owner(text, text, text, text, text) from public;
grant execute on function public.create_restaurant_with_owner(text, text, text, text, text) to authenticated;

-- The direct-insert policy from 0002 is now dead weight, and it let any signed-in
-- user create restaurants they would never be linked to. Onboarding goes through
-- the function above, which enforces the one-restaurant-per-account rule.
drop policy if exists onboarding_create_restaurant on restaurants;
