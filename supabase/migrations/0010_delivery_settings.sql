-- Dijla — delivery settings (task 3.6)
--
-- Three columns rather than three more keys in `restaurants.settings`, which is
-- where opening hours live. The split is not arbitrary:
--
--   `settings` holds shapes still being discovered — hours will grow ramadan
--   times, split shifts, per-branch variations, and a jsonb blob absorbs that
--   without a migration each time.
--
--   These three are settled. Two booleans and a price, sitting next to the
--   `delivery_fee` column they belong with, and `get_menu_by_slug` has to read
--   them on every public menu request. A column is checked by the database;
--   a jsonb key is checked by whoever remembers to.
--
-- Defaults keep today's behaviour exactly: `/r/[slug]` already takes delivery
-- and pickup orders, so defaulting either to false would silently switch off a
-- working feature the moment this runs. `min_order` defaults to 0, meaning no
-- minimum — an owner opts in, never out.

alter table restaurants
  add column if not exists delivery_enabled boolean not null default true,
  add column if not exists pickup_enabled   boolean not null default true,
  add column if not exists min_order        numeric(10,2) not null default 0;

-- A negative minimum is not a discount, it is a typo that would make every
-- order pass a check it should sometimes fail.
alter table restaurants
  drop constraint if exists restaurants_min_order_non_negative;
alter table restaurants
  add constraint restaurants_min_order_non_negative check (min_order >= 0);

comment on column restaurants.delivery_enabled is
  'Owner takes delivery orders through /r/[slug]. Gated to the pro tier in 3.7.';
comment on column restaurants.pickup_enabled is
  'Owner takes pickup orders through /r/[slug].';
comment on column restaurants.min_order is
  'Delivery only, in the restaurant currency. 0 means no minimum. Pickup is
   never blocked by it: the point of a minimum is that the trip has to be worth
   making, and a customer collecting their own food makes no trip.';

-- ---------------------------------------------------------------------------
-- the public menu has to carry them
-- ---------------------------------------------------------------------------
-- The customer page decides which checkout options to show, and what to say
-- when a basket is under the minimum, before the customer fills anything in.
-- Without these in the payload it can only find out by being refused at the
-- end, which is the worst possible moment to learn it.
--
-- Everything else about this function is unchanged from 0005 — same columns,
-- same guard on `is_active`, still the only way an anonymous browser reaches a
-- restaurant row. A closed channel is not a secret: it is what the page has to
-- render.
create or replace function public.get_menu_by_slug(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'slug', r.slug,
      'logo_url', r.logo_url,
      'currency', r.currency,
      'delivery_fee', r.delivery_fee,
      'delivery_enabled', r.delivery_enabled,
      'pickup_enabled', r.pickup_enabled,
      'min_order', r.min_order
    ),
    'categories', menu_payload(r.id)
  )
  from restaurants r
  where r.slug = p_slug
    and r.is_active;
$$;

grant execute on function public.get_menu_by_slug(text) to anon, authenticated;
