-- Dijla — admin churn workflow + cohort retention (UX_IMPROVEMENTS_SPEC §A.3, §A.4).
--
-- Two admin-only SECURITY DEFINER functions and one table:
--   admin_dormant_restaurants(days)  restaurants with no orders for N+ days
--   admin_cohort_retention()         signup-month cohorts vs months-since-signup
--   admin_outreach                   a log so the same restaurant isn't chased twice
--
-- These cross tenant boundaries by design, so every one is gated by
-- is_platform_admin() (server-side, matching the existing admin RPCs) — a
-- non-admin gets empty results, never a leak. The outreach table is admin-only
-- via RLS.
--
-- Idempotent: create-or-replace + create-if-not-exists + guarded policy.

create or replace function public.admin_dormant_restaurants(days int default 7)
returns table (
  restaurant_id uuid,
  name text,
  area text,
  phone text,
  last_order_at timestamptz,
  days_dormant int,
  lifetime_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.area,
    r.phone,
    max(o.created_at) as last_order_at,
    coalesce(extract(day from now() - max(o.created_at))::int, 999) as days_dormant,
    count(o.id) as lifetime_orders
  from restaurants r
  left join orders o on o.restaurant_id = r.id and o.status <> 'cancelled'
  where r.is_active = true
    and is_platform_admin()
  group by r.id, r.name, r.area, r.phone
  having max(o.created_at) < now() - make_interval(days => days)
      or max(o.created_at) is null;
$$;

create or replace function public.admin_cohort_retention()
returns table (
  cohort_month date,
  months_since int,
  active_count bigint,
  cohort_size bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select id, date_trunc('month', created_at)::date as cohort_month
    from restaurants
  ),
  a as (
    select o.restaurant_id, date_trunc('month', o.created_at)::date as active_month
    from orders o
    where o.status <> 'cancelled'
    group by 1, 2
  )
  select
    c.cohort_month,
    (extract(year from age(a.active_month, c.cohort_month)) * 12
      + extract(month from age(a.active_month, c.cohort_month)))::int as months_since,
    count(distinct a.restaurant_id) as active_count,
    (select count(*) from c c2 where c2.cohort_month = c.cohort_month) as cohort_size
  from c
  join a on a.restaurant_id = c.id
  where is_platform_admin()
  group by 1, 2;
$$;

create table if not exists public.admin_outreach (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  note          text,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

alter table public.admin_outreach enable row level security;

drop policy if exists admin_only_outreach on public.admin_outreach;
create policy admin_only_outreach on public.admin_outreach
  for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
