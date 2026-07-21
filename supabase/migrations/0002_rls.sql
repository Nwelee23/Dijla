-- Dijla — Row-Level Security
-- Based on the starter policies in PHASE_0_1_BUILD.md task 0.4, with the gaps
-- documented inline. Read the comments before changing anything here: this file
-- is the only thing standing between one restaurant's data and another's.
--
-- Public (anonymous) read of menus/tables for the customer pages is deliberately
-- NOT here — it arrives in Phase 2 (0003_phase2.sql). Until then anon sees nothing.

-- ---------------------------------------------------------------------------
-- helper: the restaurant of the current user
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER is required, not optional. This function reads `profiles`,
-- and `profiles` itself is protected by a policy that calls this function. As a
-- SECURITY INVOKER function that is infinite recursion, and Postgres aborts every
-- query on the table with error 42P17. Running as the owner bypasses RLS on the
-- lookup and breaks the cycle. `search_path` is pinned so the function body can't
-- be redirected by a caller-supplied search_path.
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_restaurant_id() from public;
grant execute on function public.current_restaurant_id() to authenticated;

-- ---------------------------------------------------------------------------
-- enable RLS — on EVERY table, not just the tenant-scoped ones
-- ---------------------------------------------------------------------------
-- The starter list omitted option_groups, options and order_status_history.
-- A table with no RLS is readable and writable by anyone holding the publishable
-- key, so those three would have been world-open: option_groups/options expose
-- pricing, order_status_history exposes order activity.
alter table restaurants         enable row level security;
alter table profiles            enable row level security;
alter table tables              enable row level security;
alter table menu_categories     enable row level security;
alter table menu_items          enable row level security;
alter table option_groups       enable row level security;
alter table options             enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_status_history enable row level security;
alter table subscriptions       enable row level security;

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
create policy tenant_restaurants on restaurants
  for all to authenticated
  using (id = current_restaurant_id())
  with check (id = current_restaurant_id());

-- Onboarding (task 1.2): a brand-new user has no profile yet, so
-- current_restaurant_id() is null and the policy above blocks the very first
-- insert. Without this, onboarding could only run with the service_role key.
create policy onboarding_create_restaurant on restaurants
  for insert to authenticated
  with check (current_restaurant_id() is null);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Split deliberately. The starter used a single `for all` policy with
-- `id = auth.uid() or restaurant_id = current_restaurant_id()`, which lets any
-- staff member UPDATE a colleague's row — including setting their own role to
-- 'admin'. Own row: full access. Colleagues: read only.
create policy own_profile on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy tenant_profiles_read on profiles
  for select to authenticated
  using (restaurant_id = current_restaurant_id());

-- ---------------------------------------------------------------------------
-- menu + tables (tenant-scoped)
-- ---------------------------------------------------------------------------
create policy tenant_tables on tables
  for all to authenticated
  using (restaurant_id = current_restaurant_id())
  with check (restaurant_id = current_restaurant_id());

create policy tenant_menu_categories on menu_categories
  for all to authenticated
  using (restaurant_id = current_restaurant_id())
  with check (restaurant_id = current_restaurant_id());

create policy tenant_menu_items on menu_items
  for all to authenticated
  using (restaurant_id = current_restaurant_id())
  with check (restaurant_id = current_restaurant_id());

-- option_groups/options carry no restaurant_id, so tenancy is derived by join.
create policy tenant_option_groups on option_groups
  for all to authenticated
  using (
    exists (
      select 1 from menu_items mi
      where mi.id = option_groups.item_id
        and mi.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    exists (
      select 1 from menu_items mi
      where mi.id = option_groups.item_id
        and mi.restaurant_id = current_restaurant_id()
    )
  );

create policy tenant_options on options
  for all to authenticated
  using (
    exists (
      select 1 from option_groups og
      join menu_items mi on mi.id = og.item_id
      where og.id = options.group_id
        and mi.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    exists (
      select 1 from option_groups og
      join menu_items mi on mi.id = og.item_id
      where og.id = options.group_id
        and mi.restaurant_id = current_restaurant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create policy tenant_orders on orders
  for all to authenticated
  using (restaurant_id = current_restaurant_id())
  with check (restaurant_id = current_restaurant_id());

-- Drivers see only what is assigned to them, and may only move it forward —
-- hence separate select/update policies rather than `for all`.
create policy driver_orders_read on orders
  for select to authenticated
  using (driver_id = auth.uid());

create policy driver_orders_update on orders
  for update to authenticated
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- order_items had RLS enabled but no policy in the starter, which denies all
-- access — the dashboard could not have read its own order lines.
create policy tenant_order_items on order_items
  for all to authenticated
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  );

create policy driver_order_items_read on order_items
  for select to authenticated
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.driver_id = auth.uid()
    )
  );

create policy tenant_order_status_history on order_status_history
  for all to authenticated
  using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
-- Read-only for the tenant. Billing state is changed by you (platform owner)
-- through the service_role key — a restaurant must never be able to write
-- itself an 'active' subscription.
create policy tenant_subscriptions_read on subscriptions
  for select to authenticated
  using (restaurant_id = current_restaurant_id());
