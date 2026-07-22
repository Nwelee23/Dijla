-- Dijla — growth metrics for the founder dashboard (task 7.1)
--
-- Phase 7 is the decision phase, and you cannot decide without seeing the
-- numbers. This adds the metrics layer over the admin panel: engagement and
-- retention signals derived from real data, plus a place to record WHY a
-- restaurant left, because a churn number with no reason teaches nothing.
--
-- What is here is only what the database can honestly compute. CAC and payback
-- are not — they need ad spend and cost figures the app never sees — so they are
-- deliberately absent rather than shown as a fake zero; the founder tracks those
-- outside. Renewal-cohort accounting also needs subscription-period history the
-- current single-row model does not keep, so retention is presented as the raw
-- paying-versus-churned counts, honest about what it is, not dressed up as a
-- cohort rate it cannot back.
--
-- Both functions are SECURITY DEFINER (cross-tenant) and gated by
-- is_platform_admin(), like every admin read.

-- ---------------------------------------------------------------------------
-- a place to record why a restaurant churned
-- ---------------------------------------------------------------------------
alter table subscriptions
  add column if not exists cancellation_reason text;

comment on column subscriptions.cancellation_reason is
  'Free-text why the restaurant cancelled, recorded by the admin. Feeds the
   churn log — a churn count with no reason cannot be fixed.';

-- ---------------------------------------------------------------------------
-- the growth KPIs, one row
-- ---------------------------------------------------------------------------
-- "active" is engagement, not billing: a restaurant that placed a real order in
-- the window, which is the leading indicator of retention. Cancelled orders do
-- not count as activity. "activated" is the funnel end: signed up AND took at
-- least one order ever.
create or replace function public.admin_growth_metrics()
returns table (
  total_restaurants bigint,
  active_7d         bigint,
  active_30d        bigint,
  signups_30d       bigint,
  activated         bigint,
  orders_7d         bigint,
  paying            bigint,
  trialing          bigint,
  cancelled         bigint,
  mrr               numeric,
  arpu              numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from restaurants),
    (select count(distinct restaurant_id) from orders
       where status <> 'cancelled' and created_at >= now() - interval '7 days'),
    (select count(distinct restaurant_id) from orders
       where status <> 'cancelled' and created_at >= now() - interval '30 days'),
    (select count(*) from restaurants where created_at >= now() - interval '30 days'),
    (select count(distinct restaurant_id) from orders where status <> 'cancelled'),
    (select count(*) from orders
       where status <> 'cancelled' and created_at >= now() - interval '7 days'),
    (select count(*) from subscriptions where status = 'active'),
    (select count(*) from subscriptions where status = 'trial'),
    (select count(*) from subscriptions where status = 'cancelled'),
    (select coalesce(sum(amount), 0) from subscriptions where status = 'active'),
    (select case
       when count(*) filter (where status = 'active') > 0
       then coalesce(sum(amount) filter (where status = 'active'), 0)
            / count(*) filter (where status = 'active')
       else 0
     end from subscriptions)
  where is_platform_admin();
$$;

revoke all on function public.admin_growth_metrics() from public, anon;
grant execute on function public.admin_growth_metrics() to authenticated;

-- ---------------------------------------------------------------------------
-- the churn log: who left, and why
-- ---------------------------------------------------------------------------
create or replace function public.admin_churn_log()
returns table (
  restaurant_id uuid,
  name          text,
  end_date      date,
  reason        text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, s.end_date, s.cancellation_reason
  from subscriptions s
  join restaurants r on r.id = s.restaurant_id
  where s.status = 'cancelled'
    and is_platform_admin()
  order by s.end_date desc nulls last
  limit 50;
$$;

revoke all on function public.admin_churn_log() from public, anon;
grant execute on function public.admin_churn_log() to authenticated;
