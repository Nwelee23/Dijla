-- Dijla — options in the customer menu payload (AUDIT FIX 1).
--
-- Restaurants can build option groups (size, extras) but customers never
-- received them: menu_payload returned only id/name/description/price/image, so
-- a paid "+8,000 large" or "+1,000 extra bread" could never be ordered, priced,
-- or sent to the kitchen. This rebuilds menu_payload to include each item's
-- option_groups and their options, plus name_secondary (for the second-language
-- display). The server still re-reads and re-prices options from the tables
-- directly — this payload is display only, never trusted for pricing.
--
-- Idempotent (create or replace).

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
