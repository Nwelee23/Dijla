-- Dijla — per-driver cash reconciliation for any day (task 5.2)
--
-- Phase 4's driver_cash_today answers "how much did each driver collect today".
-- Reconciliation needs two more things: any day, not just today, and what each
-- driver was *supposed* to collect set against what they recorded — so the owner
-- can spot a driver who handed back less than the orders were worth.
--
-- expected is the sum of the order totals (COD: the customer owes the whole
-- total, delivery fee included). collected is the sum of what the driver
-- recorded on delivery. The gap is the shortfall the end-of-day count has to
-- explain. Both are over that driver's delivered orders for the day, keyed on
-- updated_at — for a terminal, cash-carrying order that is the moment of
-- delivery, with no later write to move it.
--
-- SECURITY INVOKER like the reporting RPCs: RLS scopes profiles and orders to
-- the caller's restaurant, and is_restaurant_staff() keeps this the owner's
-- view. The left join keeps every driver on the sheet, a zero row rather than a
-- gap, so the count is accountable for the whole fleet.

create or replace function public.driver_cash_reconciliation(
  rid uuid, day_start timestamptz, day_end timestamptz
)
returns table (
  driver_id       uuid,
  driver_name     text,
  delivered_count bigint,
  expected        numeric,
  collected       numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    count(o.id),
    coalesce(sum(o.total), 0),
    coalesce(sum(o.cash_collected), 0)
  from profiles p
  left join orders o
    on o.driver_id = p.id
    and o.restaurant_id = p.restaurant_id
    and o.status = 'delivered'
    and o.type = 'delivery'
    and o.updated_at >= day_start
    and o.updated_at < day_end
  where p.role = 'driver'
    and p.restaurant_id = rid
    and is_restaurant_staff()
  group by p.id, p.full_name
  order by p.full_name;
$$;

revoke all on function public.driver_cash_reconciliation(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.driver_cash_reconciliation(uuid, timestamptz, timestamptz) to authenticated;
