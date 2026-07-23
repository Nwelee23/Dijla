-- Dijla — second-language menu fields (MENU_BUILDER_SPEC §6).
--
-- Najaf receives millions of foreign pilgrims, most of them Persian-speaking.
-- Add a second name (and description) to menu items NOW — even though the
-- customer-facing language switcher ships later — so the schema is not
-- restructured afterwards. One price, multiple names. Both optional; a dish is
-- fully valid with only its Arabic name. Idempotent.

alter table menu_items
  add column if not exists name_secondary text,
  add column if not exists description_secondary text;

comment on column menu_items.name_secondary is
  'Optional second-language dish name (MENU_BUILDER_SPEC §6), e.g. Persian for
   Najaf pilgrims. Same item, same price — just another name.';
