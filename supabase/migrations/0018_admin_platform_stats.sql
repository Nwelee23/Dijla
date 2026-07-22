-- Dijla — platform KPIs for the admin home (task 5.5)
--
-- One aggregated read of the whole platform, and the subscription amount added
-- to the per-restaurant list so the admin can set and see it. MRR is the sum of
-- the amounts on active subscriptions — meaningful only once the admin records a
-- price, which the subscription editor now captures.
--
-- Both functions are SECURITY DEFINER (they cross tenants) and gated by
-- is_platform_admin() so they cross tenants for an admin alone.

-- ---------------------------------------------------------------------------
-- admin_restaurants: carry the subscription amount too
-- ---------------------------------------------------------------------------
-- Unchanged from 0017 except for the amount column, so the editor can preload
-- the current price. create-or-replace of a function whose return type changes
-- requires dropping it first — the signature (the OUT columns) is part of it.
drop function if exists public.admin_restaurants();
create function public.admin_restaurants()
returns table (
  id            uuid,
  name          text,
  slug          text,
  is_active     boolean,
  created_at    timestamptz,
  tier          text,
  status        text,
  amount        numeric,
  start_date    date,
  end_date      date,
  order_count   bigint,
  last_order_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id, r.name, r.slug, r.is_active, r.created_at,
    s.tier, s.status, s.amount, s.start_date, s.end_date,
    count(o.id), max(o.created_at)
  from restaurants r
  left join subscriptions s on s.restaurant_id = r.id
  left join orders o on o.restaurant_id = r.id
  where is_platform_admin()
  group by r.id, r.name, r.slug, r.is_active, r.created_at,
           s.tier, s.status, s.amount, s.start_date, s.end_date
  order by r.created_at desc;
$$;

revoke all on function public.admin_restaurants() from public, anon;
grant execute on function public.admin_restaurants() to authenticated;

-- ---------------------------------------------------------------------------
-- platform KPIs, one row
-- ---------------------------------------------------------------------------
-- The status counts come off subscriptions, the suspended count off restaurants
-- (is_active false), total orders excludes cancelled to match the sales report,
-- and MRR is the active amounts. The trailing is_platform_admin() guard filters
-- the single result row away for a non-admin, so the numbers never leave the
-- platform to anyone else.
create or replace function public.admin_platform_stats()
returns table (
  total_restaurants bigint,
  active_count      bigint,
  trial_count       bigint,
  past_due_count    bigint,
  cancelled_count   bigint,
  suspended_count   bigint,
  total_orders      bigint,
  mrr               numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from restaurants),
    (select count(*) from subscriptions where status = 'active'),
    (select count(*) from subscriptions where status = 'trial'),
    (select count(*) from subscriptions where status = 'past_due'),
    (select count(*) from subscriptions where status = 'cancelled'),
    (select count(*) from restaurants where is_active = false),
    (select count(*) from orders where status <> 'cancelled'),
    (select coalesce(sum(amount), 0) from subscriptions where status = 'active')
  where is_platform_admin();
$$;

revoke all on function public.admin_platform_stats() from public, anon;
grant execute on function public.admin_platform_stats() to authenticated;
