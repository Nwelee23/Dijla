-- Dijla — customer menu layout choice (REDESIGN_V2_SPEC §8, prompt R7).
--
-- The restaurant picks how its menu renders to customers:
--   grid      two-column photo grid (highest conversion; needs good photos)
--   list      compact rows with small thumbnails (large menus / few photos)
--   featured  one hero item, then compact rows (raises average order value)
--   auto      pick grid or list automatically from photo coverage (the default)
--
-- 'auto' is the default so even a restaurant that never opens Settings gets a
-- good-looking menu. Read server-side and passed to the customer menu; nothing
-- here is security-sensitive.
--
-- Idempotent: add-column-if-not-exists with a CHECK. Safe to re-run.

alter table restaurants
  add column if not exists menu_layout text not null default 'auto'
  check (menu_layout in ('auto', 'grid', 'list', 'featured'));
