-- Dijla — learned prep time (UX_IMPROVEMENTS_SPEC §D.2)
--
-- The manual `prep_minutes` (migration 0026) is a guess the owner typed once.
-- This derives the real thing from history: the median wall-clock minutes an
-- order spent between `new` and `ready`, attributed to each item on it, over a
-- recent window. It is only ever *offered* as a suggestion in the menu builder —
-- the owner's typed value is never silently overwritten — so a robust median
-- (not a mean) and a minimum sample size keep one slow night from skewing it.
--
-- Idempotent: create-or-replace + re-grant, safe to re-run.

create or replace function public.learned_prep_minutes(
  p_days int default 30,
  p_min_sample int default 5
)
returns table (
  menu_item_id uuid,
  median_minutes numeric,
  sample_size bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with rid as (
    -- Scoped to the caller's own restaurant. `auth.uid()` still reads the
    -- caller's JWT inside a SECURITY DEFINER function, so this never crosses
    -- tenants even though the body runs with elevated rights.
    select current_restaurant_id() as restaurant_id
  ),
  -- First `new` and first `ready` per order. The undo (0007) can write a status
  -- more than once; taking the earliest of each gives the true span and ignores
  -- a mis-tap that was reverted.
  spans as (
    select
      o.id as order_id,
      min(h.created_at) filter (where h.status = 'new')   as started_at,
      min(h.created_at) filter (where h.status = 'ready') as ready_at
    from orders o
    join order_status_history h on h.order_id = o.id
    where o.restaurant_id = (select restaurant_id from rid)
      and o.created_at >= now() - make_interval(days => p_days)
    group by o.id
  ),
  durations as (
    select order_id,
           extract(epoch from (ready_at - started_at)) / 60.0 as minutes
    from spans
    where started_at is not null
      and ready_at is not null
      and ready_at > started_at
  ),
  per_item as (
    select oi.menu_item_id, d.minutes
    from durations d
    join order_items oi on oi.order_id = d.order_id
    where oi.menu_item_id is not null
  )
  select
    menu_item_id,
    round(percentile_cont(0.5) within group (order by minutes)::numeric, 0) as median_minutes,
    count(*) as sample_size
  from per_item
  group by menu_item_id
  having count(*) >= greatest(p_min_sample, 1);
$$;

revoke all on function public.learned_prep_minutes(int, int) from public;
grant execute on function public.learned_prep_minutes(int, int) to authenticated;
