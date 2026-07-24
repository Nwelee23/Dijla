-- Dijla — driver "arrived" (UX_IMPROVEMENTS_SPEC §C.3).
--
-- A driver taps «وصلت» at the door; the customer's tracking page then shows the
-- driver has arrived, which heads off the "where is my order?" calls that
-- interrupt the kitchen.
--
-- Adds orders.driver_arrived_at and exposes it to the customer status poll as a
-- PII-free boolean `arrived` (the timestamp itself never leaves the server).
-- The driver writes it through the existing driver route, whose ownership check
-- and column whitelist are unchanged except for this one column.
--
-- Idempotent: add-if-not-exists + create-or-replace. Safe to re-run.

alter table orders add column if not exists driver_arrived_at timestamptz;

create or replace function public.get_order_status(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orderNumber', o.order_number,
    'status',      o.status,
    'total',       o.total,
    'createdAt',   o.created_at,
    'arrived',     (o.driver_arrived_at is not null)
  )
  from orders o
  where o.id = p_order_id;
$$;

revoke all on function public.get_order_status(uuid) from public;
grant execute on function public.get_order_status(uuid) to anon, authenticated;
