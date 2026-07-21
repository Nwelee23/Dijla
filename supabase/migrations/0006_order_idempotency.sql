-- Dijla — idempotent order placement (task 2.5)
--
-- The first attempt at "do not cook this twice" compared a new order against
-- recent ones by table, total and line count. Two problems, both found by test:
--
-- 1. Read-then-write is not atomic. A genuine double-tap fires two requests
--    within milliseconds; both read "no recent match" before either inserts,
--    and the kitchen gets two tickets.
--
-- 2. Worse, the heuristic is wrong even when it works. "Kebab, no onions" and
--    "Kebab, extra spicy" ordered back to back have the same total and the same
--    line count — so the second order would silently vanish. Losing a diner's
--    order is a worse failure than duplicating one.
--
-- Instead the client mints one id per submission and reuses it across retries.
-- The unique index makes the database, not application logic, the thing that
-- decides a duplicate — so concurrency cannot slip past it, and two genuinely
-- different orders are never merged.

alter table orders
  add column if not exists client_request_id uuid;

-- Partial: rows created before this column exists (and any future server-side
-- order) leave it null, and nulls must not collide with each other.
create unique index if not exists orders_client_request_id_key
  on orders (client_request_id)
  where client_request_id is not null;
