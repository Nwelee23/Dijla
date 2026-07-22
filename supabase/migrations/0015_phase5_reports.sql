-- Dijla — sales reporting (task 5.1)
--
-- The brief ships one summary RPC and asks the page to add "a couple of small
-- aggregate queries" for the type split, top items and busiest hours. Those are
-- aggregates too, and the ground rule is that aggregation happens server-side,
-- never by pulling every order to the browser — so they are RPCs here beside
-- the summary rather than client-side reductions.
--
-- SECURITY INVOKER (the default): each runs as the caller, so RLS on orders and
-- order_items already scopes every row to the caller's own restaurant. The `rid`
-- argument is then only a convenience — a caller who passes someone else's id
-- still sees nothing, because RLS filters to their rows first and the id filter
-- removes the rest.
--
-- One guard is added beyond the brief: `is_restaurant_staff()`. Without it a
-- driver, whose RLS view of orders is the ones assigned to them, could call
-- these and read totals over their own deliveries. Reports are the owner's
-- view, so a non-staff caller gets zeros. search_path is pinned on each, as on
-- every function in this project.
--
-- "Revenue" is every non-cancelled order's total — bookings, not settled cash.
-- cash_collected (delivered COD only) is returned alongside so the owner can
-- see booked-versus-collected rather than conflating them.

-- ---------------------------------------------------------------------------
-- indexes the ranges scan on
-- ---------------------------------------------------------------------------
create index if not exists idx_orders_rest_created
  on orders (restaurant_id, created_at);
create index if not exists idx_orders_rest_status_created
  on orders (restaurant_id, status, created_at);
create index if not exists idx_order_items_order
  on order_items (order_id);

-- ---------------------------------------------------------------------------
-- summary: revenue, count, average, cash
-- ---------------------------------------------------------------------------
create or replace function public.restaurant_sales_summary(
  rid uuid, from_ts timestamptz, to_ts timestamptz
)
returns table (order_count bigint, revenue numeric, avg_order numeric, cash_collected numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    coalesce(sum(total), 0),
    coalesce(avg(total), 0),
    coalesce(sum(cash_collected), 0)
  from orders
  where restaurant_id = rid
    and is_restaurant_staff()
    and status <> 'cancelled'
    and created_at >= from_ts
    and created_at < to_ts;
$$;

-- ---------------------------------------------------------------------------
-- split by order type
-- ---------------------------------------------------------------------------
create or replace function public.restaurant_sales_by_type(
  rid uuid, from_ts timestamptz, to_ts timestamptz
)
returns table (type text, order_count bigint, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select o.type, count(*), coalesce(sum(o.total), 0)
  from orders o
  where o.restaurant_id = rid
    and is_restaurant_staff()
    and o.status <> 'cancelled'
    and o.created_at >= from_ts
    and o.created_at < to_ts
  group by o.type;
$$;

-- ---------------------------------------------------------------------------
-- top items by quantity sold, over the range
-- ---------------------------------------------------------------------------
-- Grouped by name_snapshot, not menu_item_id: a renamed or deleted dish still
-- reports under the name it sold as, and the snapshot is what the customer paid
-- for. lim is capped so a caller cannot ask for an unbounded scan.
create or replace function public.restaurant_top_items(
  rid uuid, from_ts timestamptz, to_ts timestamptz, lim int default 10
)
returns table (name text, quantity bigint, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    oi.name_snapshot,
    sum(oi.quantity),
    coalesce(sum(oi.price_snapshot * oi.quantity), 0)
  from order_items oi
  join orders o on o.id = oi.order_id
  where o.restaurant_id = rid
    and is_restaurant_staff()
    and o.status <> 'cancelled'
    and o.created_at >= from_ts
    and o.created_at < to_ts
  group by oi.name_snapshot
  order by sum(oi.quantity) desc
  limit least(greatest(lim, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- busiest hours, in Baghdad local time
-- ---------------------------------------------------------------------------
-- The hour of day a restaurant is busy is a wall-clock question, so it is asked
-- in Asia/Baghdad, not UTC — the same anchor the rest of the app uses.
create or replace function public.restaurant_hourly(
  rid uuid, from_ts timestamptz, to_ts timestamptz
)
returns table (hour int, order_count bigint, revenue numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(hour from (o.created_at at time zone 'Asia/Baghdad'))::int,
    count(*),
    coalesce(sum(o.total), 0)
  from orders o
  where o.restaurant_id = rid
    and is_restaurant_staff()
    and o.status <> 'cancelled'
    and o.created_at >= from_ts
    and o.created_at < to_ts
  group by 1
  order by 1;
$$;

revoke all on function public.restaurant_sales_summary(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.restaurant_sales_by_type(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.restaurant_top_items(uuid, timestamptz, timestamptz, int) from public, anon;
revoke all on function public.restaurant_hourly(uuid, timestamptz, timestamptz) from public, anon;

grant execute on function public.restaurant_sales_summary(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.restaurant_sales_by_type(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.restaurant_top_items(uuid, timestamptz, timestamptz, int) to authenticated;
grant execute on function public.restaurant_hourly(uuid, timestamptz, timestamptz) to authenticated;
