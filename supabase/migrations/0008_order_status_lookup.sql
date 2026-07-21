-- Dijla — order status for the diner (task 2.7)
--
-- The brief asks for Realtime on the customer page, with polling as a fallback.
-- Realtime is not available here, and the reason matters:
--
-- Realtime applies RLS per subscriber. A diner is anonymous, and `orders` has no
-- anon SELECT policy — by design, since that table holds customer names, phone
-- numbers and delivery pins for every order on the platform. Subscribing an
-- anonymous browser to it would mean opening all of that to anyone holding the
-- publishable key. A live status bar is not worth that trade.
--
-- So the diner polls this function instead. The order id is a v4 uuid that only
-- the device that placed the order was ever told, which makes it the capability:
-- knowing it is the proof, and it grants nothing but the status of that one row.
--
-- Note what is deliberately absent from the payload: no customer name, no phone,
-- no table token, no other order. Only what the diner already knows plus how far
-- along their food is.

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
    'createdAt',   o.created_at
  )
  from orders o
  where o.id = p_order_id;
$$;

revoke all on function public.get_order_status(uuid) from public;
grant execute on function public.get_order_status(uuid) to anon, authenticated;
