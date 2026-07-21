-- Dijla — drivers are not staff (prerequisite for phase 4)
--
-- The phase 4 brief states as a ground rule:
--
--   "The RLS `driver_orders` policy already lets a driver read only orders
--    where driver_id = auth.uid()."
--
-- That is not true, and the whole phase 4 permission model rests on it.
--
-- Verified against the live database before writing this file. A driver profile
-- with no orders assigned to it read the full customer record of an order
-- assigned to nobody:
--
--   orders visible to an UNASSIGNED driver: 1
--     {"order_number":1,"customer_name":"Muhammed",
--      "customer_phone":"+9647809884558",
--      "customer_lat":32.0178555,"customer_lng":44.3139292,"driver_id":null}
--
-- The cause is not a missing policy, it is an extra one. `tenant_orders` is
-- `for all using (restaurant_id = current_restaurant_id())`, and a driver's
-- profile carries `restaurant_id` — a driver *is* a member of the tenant. In
-- PostgreSQL, permissive policies for the same command are combined with OR, so
-- the narrower `driver_orders_read` never subtracts anything. It only adds.
--
-- The same reasoning applies to every other `tenant_*` policy, and one of them
-- is worse than the orders leak: `tenant_tables` publishes every `qr_token` in
-- the restaurant to anyone with role='driver'. 0005 refused to expose those to
-- anonymous customers precisely because a valid token is a tool for flooding a
-- kitchen with fake orders during service. A dismissed driver keeps their login
-- until someone remembers to deactivate it.
--
-- So: being in the tenant is no longer sufficient for the tenant policies.
-- Staff get them; drivers get their own, narrower grants.

-- ---------------------------------------------------------------------------
-- 1. who is staff
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER for the same reason as current_restaurant_id(): it reads
-- `profiles`, whose own policies would otherwise call it recursively and abort
-- every query on the table with 42P17.
create or replace function public.is_restaurant_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('owner', 'staff', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_restaurant_staff() from public;
grant execute on function public.is_restaurant_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. the tenant policies now mean "staff of this tenant"
-- ---------------------------------------------------------------------------
drop policy if exists tenant_restaurants on restaurants;
create policy tenant_restaurants on restaurants
  for all to authenticated
  using (id = current_restaurant_id() and is_restaurant_staff())
  with check (id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_profiles_read on profiles;
create policy tenant_profiles_read on profiles
  for select to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_tables on tables;
create policy tenant_tables on tables
  for all to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_menu_categories on menu_categories;
create policy tenant_menu_categories on menu_categories
  for all to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_menu_items on menu_items;
create policy tenant_menu_items on menu_items
  for all to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_orders on orders;
create policy tenant_orders on orders
  for all to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_staff());

drop policy if exists tenant_subscriptions_read on subscriptions;
create policy tenant_subscriptions_read on subscriptions
  for select to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff());

-- waiter_calls (from 0007) is a staff table: a table calls, a waiter answers. A
-- driver has no part in it, yet the tenant membership check alone let one read
-- every open call and — worse — insert or delete them, so a dismissed driver
-- could flood the dine-in board with fake calls or clear real ones mid-service.
drop policy if exists tenant_waiter_calls on waiter_calls;
create policy tenant_waiter_calls on waiter_calls
  for all to authenticated
  using (restaurant_id = current_restaurant_id() and is_restaurant_staff())
  with check (restaurant_id = current_restaurant_id() and is_restaurant_staff());

-- option_groups, options, order_items and order_status_history are scoped
-- through a subquery on their parent rather than a plain restaurant_id, so they
-- are rewritten in full below rather than patched.
drop policy if exists tenant_option_groups on option_groups;
create policy tenant_option_groups on option_groups
  for all to authenticated
  using (
    is_restaurant_staff() and exists (
      select 1 from menu_items mi
      where mi.id = option_groups.item_id
        and mi.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    is_restaurant_staff() and exists (
      select 1 from menu_items mi
      where mi.id = option_groups.item_id
        and mi.restaurant_id = current_restaurant_id()
    )
  );

drop policy if exists tenant_options on options;
create policy tenant_options on options
  for all to authenticated
  using (
    is_restaurant_staff() and exists (
      select 1 from option_groups og
      join menu_items mi on mi.id = og.item_id
      where og.id = options.group_id
        and mi.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    is_restaurant_staff() and exists (
      select 1 from option_groups og
      join menu_items mi on mi.id = og.item_id
      where og.id = options.group_id
        and mi.restaurant_id = current_restaurant_id()
    )
  );

drop policy if exists tenant_order_items on order_items;
create policy tenant_order_items on order_items
  for all to authenticated
  using (
    is_restaurant_staff() and exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    is_restaurant_staff() and exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  );

drop policy if exists tenant_order_status_history on order_status_history;
create policy tenant_order_status_history on order_status_history
  for all to authenticated
  using (
    is_restaurant_staff() and exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  )
  with check (
    is_restaurant_staff() and exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and o.restaurant_id = current_restaurant_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. what a driver may actually read
-- ---------------------------------------------------------------------------
-- Their own assigned orders, and the lines on them. Nothing else: not the menu,
-- not the tables, not their colleagues, not the subscription. `own_profile` from
-- 0002 still gives them their own row, which is how they set their availability
-- in 4.6.
--
-- `driver_orders_read` from 0002 is kept as it stands and is now the *only*
-- thing that lets a driver see an order.

-- Guarded like every policy in this file, so the whole migration is safe to
-- re-run. It is not atomic in the Supabase SQL editor — a failure partway
-- leaves earlier statements committed — so re-running has to converge, and an
-- unguarded create would abort the second pass on "already exists" (which is
-- exactly what happened on the first attempt at this file).
drop policy if exists driver_order_items_read on order_items;
create policy driver_order_items_read on order_items
  for select to authenticated
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.driver_id = auth.uid()
    )
  );

-- The driver app shows which restaurant sent them. Read-only and their own —
-- the old tenant_restaurants let a driver UPDATE the restaurant row, which
-- included its slug and delivery fee.
drop policy if exists driver_restaurant_read on restaurants;
create policy driver_restaurant_read on restaurants
  for select to authenticated
  using (id = current_restaurant_id());

-- ---------------------------------------------------------------------------
-- 4. drivers do not write to orders directly
-- ---------------------------------------------------------------------------
-- The phase 4 brief's own ground rule says driver writes must go through a
-- server route that whitelists the fields, "RLS can't restrict columns, so
-- never let the driver update the row directly" — and then 0002 shipped exactly
-- such a policy. `driver_orders_update` lets a driver holding one delivery
-- rewrite its `total`, its `delivery_fee`, its `cash_collected`, or move it to
-- another restaurant.
--
-- Dropped rather than narrowed, because it cannot be narrowed: the restriction
-- needed is per-column, and RLS is per-row. Task 4.5 does these writes with the
-- service_role key behind a route that checks driver_id and accepts only a
-- status transition or a cash amount.
drop policy if exists driver_orders_update on orders;
