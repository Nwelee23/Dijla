-- Dijla — Web Push subscriptions (REDESIGN_V2_SPEC §11, prompt R10).
--
-- The in-page alert (sound + tab badge) only fires while the dashboard is open.
-- Web Push delivers a new-order notification even when the tab is closed or the
-- phone is locked, which is the difference between a caught order and a missed
-- one. Each browser that grants permission stores its PushSubscription here.
--
-- RLS: a user only ever sees/manages their own subscriptions. The server send
-- path uses the service role (which bypasses RLS) to read a restaurant's
-- subscriptions and push to them.
--
-- Idempotent: create-if-not-exists + guarded policy. Safe to re-run.

create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists own_push_subscriptions on push_subscriptions;
create policy own_push_subscriptions on push_subscriptions
  for all using (user_id = auth.uid());
