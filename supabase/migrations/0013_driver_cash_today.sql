-- Dijla — per-driver cash collected today (task 4.8)
--
-- The owner reconciles the day's cash-on-delivery against each driver: how much
-- each collected, over how many deliveries. "Today" is Asia/Baghdad, never the
-- server's UTC — the same anchor opening hours use, or a shift that runs past
-- 21:00 Baghdad would roll into tomorrow's total mid-evening.
--
-- SECURITY DEFINER, so it must scope itself: current_restaurant_id() ties the
-- result to the caller's own restaurant, and is_restaurant_staff() means a
-- driver who calls it gets nothing — cash across the fleet is the owner's view,
-- not one driver's.
--
-- "Delivered today" keys off orders.updated_at rather than the status-history
-- table. delivered is terminal and the cash is written in the same update that
-- sets it, so updated_at IS the moment of delivery for a delivered order, with
-- no later write to move it. A left join keeps every driver in the list, so a
-- driver who has delivered nothing today still shows with a zero rather than
-- vanishing.

create or replace function public.driver_cash_today()
returns table (
  driver_id       uuid,
  driver_name     text,
  delivered_count bigint,
  cash_total      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    count(o.id),
    coalesce(sum(o.cash_collected), 0)
  from profiles p
  left join orders o
    on o.driver_id = p.id
    and o.restaurant_id = p.restaurant_id
    and o.status = 'delivered'
    and (o.updated_at at time zone 'Asia/Baghdad')::date
        = (now() at time zone 'Asia/Baghdad')::date
  where p.role = 'driver'
    and p.restaurant_id = current_restaurant_id()
    and is_restaurant_staff()
  group by p.id, p.full_name
  order by p.full_name;
$$;

revoke all on function public.driver_cash_today() from public, anon;
grant execute on function public.driver_cash_today() to authenticated;
