-- Dijla — live order feed (task 2.6)

-- ---------------------------------------------------------------------------
-- 1. Realtime
-- ---------------------------------------------------------------------------
-- Postgres only streams changes for tables in this publication. Without it the
-- dashboard subscribes successfully, reports itself connected, and simply never
-- receives an order — the worst possible failure mode for a kitchen screen.
--
-- Realtime still applies RLS per subscriber, so `tenant_orders` from 0002 keeps
-- each restaurant to its own rows on the socket exactly as it does over REST.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table order_items;
  end if;
end $$;

-- An UPDATE event carries only the changed columns unless the row is published
-- in full. The board needs the whole order to re-render a card.
alter table orders replica identity full;

-- ---------------------------------------------------------------------------
-- 2. Status history, recorded by the database
-- ---------------------------------------------------------------------------
-- The brief puts this in the app on each status change. A trigger is stricter:
-- it captures every transition regardless of which code path caused it — a
-- server action, a future admin tool, or a manual fix in the SQL editor. History
-- that silently skips entries is worse than no history, because it gets trusted.
create or replace function public.record_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists orders_record_status on orders;
create trigger orders_record_status
  after insert or update of status on orders
  for each row execute function public.record_order_status();

-- ---------------------------------------------------------------------------
-- 3. Waiter calls
-- ---------------------------------------------------------------------------
-- A dedicated table rather than a zero-item order: an empty ticket in the
-- kitchen queue is a bug report waiting to happen, and staff would have to
-- learn to ignore it.
create table if not exists waiter_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id      uuid not null references tables(id) on delete cascade,
  acknowledged  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists waiter_calls_restaurant_idx
  on waiter_calls (restaurant_id, acknowledged, created_at desc);

alter table waiter_calls enable row level security;

-- Staff see and clear their own restaurant's calls. Diners raise them through
-- the server route only, never by writing here directly.
drop policy if exists tenant_waiter_calls on waiter_calls;
create policy tenant_waiter_calls on waiter_calls
  for all to authenticated
  using (restaurant_id = current_restaurant_id())
  with check (restaurant_id = current_restaurant_id());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waiter_calls'
  ) then
    alter publication supabase_realtime add table waiter_calls;
  end if;
end $$;
