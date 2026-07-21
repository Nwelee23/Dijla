-- Dijla — public menu access for customer pages (task 2.1)
--
-- The brief proposes four public SELECT policies (restaurants, menu_categories,
-- menu_items, tables). This file deliberately does NOT add them. Three reasons,
-- in order of severity:
--
-- 1. `public_read_tables` would publish every qr_token on the platform. Anyone
--    with the publishable key could run
--        GET /rest/v1/tables?select=qr_token
--    and receive a valid token for every table in every restaurant. Task 2.5
--    creates orders after validating a qr_token, so that list is a ready-made
--    tool for flooding a rival's kitchen with fake orders during service. For a
--    ten-restaurant pilot in Najaf, one bored person could end it.
--
-- 2. A policy with no `to` clause applies to `authenticated` as well as `anon`.
--    `using (is_active = true)` therefore lets a signed-in owner of restaurant A
--    read restaurant B's rows — it silently reopens the tenant isolation that
--    0002_rls.sql exists to enforce.
--
-- 3. RLS is row-level. The brief's own note says customer queries must never
--    select `settings`, but a policy cannot enforce that: anyone holding the
--    publishable key can ask for every column of every readable row.
--
-- Instead, customer pages read through the SECURITY DEFINER functions below.
-- They return exactly the columns a menu needs, only for active restaurants,
-- and a qr_token can be redeemed but never enumerated. Every table stays closed
-- to anon, so the isolation tests from phase 0 continue to hold unchanged.

-- ---------------------------------------------------------------------------
-- shared: the menu of one restaurant, as JSON
-- ---------------------------------------------------------------------------
create or replace function public.menu_payload(p_restaurant uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(section.obj order by section.sort_order, section.name),
    '[]'::jsonb
  )
  from (
    select
      mc.sort_order,
      mc.name,
      jsonb_build_object(
        'id', mc.id,
        'name', mc.name,
        'items', items.list
      ) as obj
    from menu_categories mc
    cross join lateral (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'name', mi.name,
            'description', mi.description,
            'price', mi.price,
            'image_url', mi.image_url
          )
          order by mi.sort_order, mi.name
        ),
        '[]'::jsonb
      ) as list
      from menu_items mi
      where mi.category_id = mc.id
        and mi.restaurant_id = p_restaurant
        and mi.is_available
    ) items
    where mc.restaurant_id = p_restaurant
      and mc.is_active
      -- A category whose items are all sold out reads as a bug to a diner.
      and items.list <> '[]'::jsonb
  ) section;
$$;

-- Internal helper: reachable only through the two entry points below.
revoke all on function public.menu_payload(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- entry point: dine-in, by table QR token
-- ---------------------------------------------------------------------------
-- Returns null for an unknown token, an inactive table, or an inactive
-- restaurant — the caller shows one friendly screen for all three rather than
-- telling a stranger which of the three it was.
create or replace function public.get_menu_by_qr_token(p_token text)
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
      'currency', r.currency
    ),
    'table', jsonb_build_object(
      'id', t.id,
      'table_number', t.table_number,
      'label', t.label
    ),
    'categories', menu_payload(r.id)
  )
  from tables t
  join restaurants r on r.id = t.restaurant_id
  where t.qr_token = p_token
    and t.is_active
    and r.is_active;
$$;

grant execute on function public.get_menu_by_qr_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- entry point: delivery link, by restaurant slug (phase 3 uses this)
-- ---------------------------------------------------------------------------
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
      'delivery_fee', r.delivery_fee
    ),
    'categories', menu_payload(r.id)
  )
  from restaurants r
  where r.slug = p_slug
    and r.is_active;
$$;

grant execute on function public.get_menu_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- per-restaurant order numbers
-- ---------------------------------------------------------------------------
-- Diners and staff refer to "order 14", not to a uuid, and the count has to
-- restart per restaurant. The upsert takes a row lock on conflict, so two
-- diners ordering in the same second cannot receive the same number.
create table if not exists order_counters (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  last_number   int not null default 0
);

-- No policies: only the server route reaches this, through service_role, which
-- bypasses RLS. Enabling it means a leaked publishable key still sees nothing.
alter table order_counters enable row level security;

create or replace function public.next_order_number(rid uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into order_counters (restaurant_id, last_number)
    values (rid, 1)
  on conflict (restaurant_id)
    do update set last_number = order_counters.last_number + 1
  returning last_number into n;

  return n;
end;
$$;

-- Order creation is server-only (task 2.5). A diner must never be able to burn
-- order numbers by calling this directly.
revoke all on function public.next_order_number(uuid) from public, anon, authenticated;
grant execute on function public.next_order_number(uuid) to service_role;
