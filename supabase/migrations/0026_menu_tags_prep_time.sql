-- Dijla — item tags + prep time (REDESIGN_V2_SPEC §5, prompt R4).
--
-- Adds two per-item fields:
--   tags          free-form labels (نباتي، حار …), validated in app code against
--                 a known set; used by the customer filter panel and the badges.
--   prep_minutes  the owner's estimate, shown as an ETA and filterable
--                 ("أقل من ١٥ دقيقة"). Later (UX §D.2) a learned median can suggest
--                 a value, but the column is the manual source of truth.
--
-- Both are exposed to the customer through menu_payload (display only — nothing
-- here is ever trusted for pricing, which the order route still recomputes).
--
-- Idempotent: add-column-if-not-exists, create-index-if-not-exists, and
-- create-or-replace for the function. Safe to re-run.

alter table menu_items add column if not exists tags text[] not null default '{}';
alter table menu_items add column if not exists prep_minutes int;

-- GIN index so a tag filter ("show me everything نباتي") stays fast as menus grow.
create index if not exists idx_menu_items_tags on menu_items using gin (tags);

-- Rebuild menu_payload (last defined in 0025) to also carry tags + prep_minutes.
-- Everything else is unchanged from 0025.
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
        and mi.is_available
    ) items
    where mc.restaurant_id = p_restaurant
      and mc.is_active
      and items.list <> '[]'::jsonb
  ) section;
$$;
