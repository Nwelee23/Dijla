-- Dijla — sold-out handling with next-day auto-restore (REDESIGN_V2_SPEC §6, R5).
--
-- Until now `is_available = false` simply HID an item from the customer menu.
-- The redesign shows it dimmed instead ("نفد اليوم — يرجع غداً"), which signals a
-- wider range and invites a return visit. Two new fields drive the restore:
--   sold_out_at   when it was marked sold out (set when toggled off)
--   auto_restore  whether it comes back on its own next service day (default yes;
--                 the owner can pin an item "نفد بشكل دائم" by turning this off)
--
-- Auto-restore runs lazily: restore_sold_out() flips stale sold-outs back at the
-- start of the next service day (Asia/Baghdad; Iraq is UTC+3, no DST). It is
-- called server-side on menu load — no pg_cron dependency.
--
-- menu_payload is rebuilt (last defined in 0026) to STOP hiding sold-out items
-- and to carry is_available, so the customer can see them dimmed and unaddable.
-- The order route still re-reads is_available and refuses a sold-out item, so
-- showing it can never let it be ordered.
--
-- Idempotent: add-if-not-exists + create-or-replace. Safe to re-run.

alter table menu_items add column if not exists sold_out_at timestamptz;
alter table menu_items add column if not exists auto_restore boolean not null default true;

-- Bring back items sold out on an earlier Baghdad-calendar day, unless the owner
-- opted out. Cheap and indexed on the common case (usually matches nothing).
create or replace function public.restore_sold_out(p_restaurant uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update menu_items
     set is_available = true,
         sold_out_at = null
   where restaurant_id = p_restaurant
     and is_available = false
     and auto_restore = true
     and sold_out_at is not null
     and sold_out_at < (date_trunc('day', now() at time zone 'Asia/Baghdad')
                        at time zone 'Asia/Baghdad');
$$;

-- Service-role only (called from the server on menu load). Never exposed to anon.
revoke all on function public.restore_sold_out(uuid) from public, anon, authenticated;

-- Rebuild menu_payload: include sold-out items (dimmed on the client) and carry
-- is_available. Everything else is unchanged from 0026.
create or replace function public.menu_payload(p_restaurant uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(section.obj order by section.sort_order, section.name),
    '[]'::jsonb
  )
  from (
    select
      mc.sort_order,
      mc.name,
      jsonb_build_object(
        'id', mc.id,
        'name', mc.name,
        'items', items.list
      ) as obj
    from menu_categories mc
    cross join lateral (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', mi.id,
            'name', mi.name,
            'name_secondary', mi.name_secondary,
            'description', mi.description,
            'price', mi.price,
            'image_url', mi.image_url,
            'tags', mi.tags,
            'prep_minutes', mi.prep_minutes,
            'is_available', mi.is_available,
            'option_groups', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'id', og.id,
                    'name', og.name,
                    'is_required', og.is_required,
                    'max_select', og.max_select,
                    'options', (
                      select coalesce(
                        jsonb_agg(
                          jsonb_build_object(
                            'id', o.id,
                            'name', o.name,
                            'price_delta', o.price_delta
                          )
                          order by o.id
                        ),
                        '[]'::jsonb
                      )
                      from options o
                      where o.group_id = og.id
                    )
                  )
                  order by og.id
                ),
                '[]'::jsonb
              )
              from option_groups og
              where og.item_id = mi.id
            )
          )
          order by mi.sort_order, mi.name
        ),
        '[]'::jsonb
      ) as list
      from menu_items mi
      where mi.category_id = mc.id
        and mi.restaurant_id = p_restaurant
    ) items
    where mc.restaurant_id = p_restaurant
      and mc.is_active
      and items.list <> '[]'::jsonb
  ) section;
$$;
