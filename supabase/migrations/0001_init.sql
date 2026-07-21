-- Dijla — initial schema
-- Source: DIJLA_PROJECT_PLAN.md §8 / PHASE_0_1_BUILD.md task 0.4
-- RLS is enabled separately in 0002_rls.sql.

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  phone text,
  area text,
  lat double precision,
  lng double precision,
  delivery_fee numeric(10,2) default 0,
  currency text default 'IQD',
  is_active boolean default true,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  full_name text,
  phone text,
  role text not null check (role in ('owner','staff','driver','admin')),
  driver_status text check (driver_status in ('available','busy','offline')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number text not null,
  label text,
  qr_token text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  is_active boolean default true
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid references menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  is_available boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table option_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  is_required boolean default false,
  max_select int default 1
);

create table options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) default 0
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_number int not null,
  type text not null check (type in ('dine_in','delivery','pickup')),
  status text not null default 'new'
    check (status in ('new','accepted','preparing','ready','out_for_delivery','delivered','cancelled')),
  table_id uuid references tables(id),
  customer_name text,
  customer_phone text,
  customer_lat double precision,
  customer_lng double precision,
  customer_landmark text,
  delivery_notes text,
  driver_id uuid references profiles(id),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text default 'cash' check (payment_method in ('cash','wallet')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid','paid')),
  cash_collected numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name_snapshot text not null,
  price_snapshot numeric(10,2) not null,
  quantity int not null default 1,
  options_snapshot jsonb default '[]'::jsonb,
  notes text
);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  changed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  tier text not null check (tier in ('basic','pro')),
  status text not null default 'trial' check (status in ('trial','active','past_due','cancelled')),
  amount numeric(10,2),
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create index on orders (restaurant_id, status);
create index on orders (restaurant_id, created_at desc);
create index on menu_items (restaurant_id, category_id);
create index on profiles (restaurant_id, role);

-- Added: every RLS policy below joins through one of these, and an order's
-- item list is read on every dashboard refresh.
create index on order_items (order_id);
create index on order_status_history (order_id);
create index on option_groups (item_id);
create index on options (group_id);
create index on menu_categories (restaurant_id);
create index on tables (restaurant_id);
create index on subscriptions (restaurant_id);

-- Added: orders.updated_at is declared but nothing maintains it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on orders
  for each row execute function public.set_updated_at();
