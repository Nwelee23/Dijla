-- Dijla — optional per-item cost, for margin/profit reporting
-- (UX_IMPROVEMENTS_SPEC §B.5).
--
-- Entirely optional: an item with no cost is simply excluded from the profit
-- view. cost is NEVER exposed on any customer-facing surface — it stays in the
-- dashboard/reports only (menu_payload does not carry it, and won't).
--
-- Idempotent: add-column-if-not-exists. Safe to re-run.

alter table menu_items add column if not exists cost numeric(10,2);
