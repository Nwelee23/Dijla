-- Dijla — trilingual menu content (REDESIGN_V2_SPEC §10, prompt R9).
--
-- Najaf draws Persian-speaking pilgrims, so a dish carries up to three names at
-- one price: Arabic (name/description), English (name_secondary/
-- description_secondary, since 0024), and now Persian (name_fa/description_fa).
--
-- menu_payload is rebuilt (last defined in 0027) to carry all three languages'
-- name AND description, so the customer can switch content language with a
-- fallback to Arabic. Everything else is unchanged from 0027.
--
-- Idempotent: add-if-not-exists + create-or-replace. Safe to re-run.

alter table menu_items add column if not exists name_fa text;
alter table menu_items add column if not exists description_fa text;

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
            'name_fa', mi.name_fa,
            'description', mi.description,
            'description_secondary', mi.description_secondary,
            'description_fa', mi.description_fa,
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
