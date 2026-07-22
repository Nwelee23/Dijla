-- Dijla — super-admin foundations (task 5.4)
--
-- The super-admin is the platform owner, and cross-tenant: they see and manage
-- every restaurant, where everyone else is fenced to their own by RLS. Two
-- pieces here — a way to ask "is the caller an admin", and one aggregated read
-- of every tenant — plus the one-off seed that makes the first admin.
--
-- Admin WRITES (suspend a restaurant, set a subscription) do not live here: they
-- run in server actions with the service_role key, behind a role check, the same
-- shape the driver writes use. Only the aggregated READ needs SQL, because it
-- groups orders per restaurant, which a client-side reduction must never do.

-- ---------------------------------------------------------------------------
-- is the caller a platform admin
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as current_restaurant_id(): it reads
-- profiles, and a non-definer read would recurse through that table's policies.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- every restaurant, with its subscription and usage
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it reaches across tenants, and gated by is_platform_admin()
-- so it reaches across tenants ONLY for an admin — anyone else gets no rows. The
-- order count and last-active come from a left join so a restaurant with no
-- orders still lists, as a zero.
create or replace function public.admin_restaurants()
returns table (
  id            uuid,
  name          text,
  slug          text,
  is_active     boolean,
  created_at    timestamptz,
  tier          text,
  status        text,
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
    s.tier, s.status, s.start_date, s.end_date,
    count(o.id), max(o.created_at)
  from restaurants r
  left join subscriptions s on s.restaurant_id = r.id
  left join orders o on o.restaurant_id = r.id
  where is_platform_admin()
  group by r.id, r.name, r.slug, r.is_active, r.created_at,
           s.tier, s.status, s.start_date, s.end_date
  order by r.created_at desc;
$$;

revoke all on function public.admin_restaurants() from public, anon;
grant execute on function public.admin_restaurants() to authenticated;

-- ---------------------------------------------------------------------------
-- seed the first admin — one-off, run once, then it is a no-op
-- ---------------------------------------------------------------------------
-- This is the documented one-off from the brief: it promotes the platform
-- owner's own account to admin. It matches by email so it is readable, affects
-- exactly that one row, and does nothing on any database where that account does
-- not exist. The self-update guard (0012) does not fire here — a migration runs
-- with no auth.uid(), which is the trusted path the guard lets through.
--
-- Change the email if the platform-owner account is different.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'uk.kufa2023@gmail.com');
