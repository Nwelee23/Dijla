-- Dijla — order cancellation reason (ORDERS_DASHBOARD_SPEC §8).
--
-- Cancelling a live order must carry a reason (and a confirm step in the UI):
-- "wrong table", "customer changed their mind", "out of stock". Without it the
-- archive is a list of cancellations nobody can account for at end of day, or
-- explain when a customer disputes one. One nullable column; only cancellations
-- fill it. Idempotent.

alter table orders
  add column if not exists cancellation_reason text;

comment on column orders.cancellation_reason is
  'Why a live order was cancelled (ORDERS_DASHBOARD_SPEC §8), captured at the
   confirm step. Null for orders that were never cancelled.';
