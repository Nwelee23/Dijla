# Dijla — Phase 0 & Phase 1 Build Brief

This file is written so an **agent IDE (Antigravity, Cursor, or Claude Code)** can execute it step by step. Work top to bottom.
Do each task, then check its **✅ Acceptance** before moving on. Ask me only when a step needs my Supabase/Vercel account or secrets.

> Full context is in `AGENTS.md` and `DIJLA_PROJECT_PLAN.md`. Project name: **Dijla** (دجلة).

---

## How to use this (for me, the owner)

1. Create an empty folder, run `git init`, and drop `AGENTS.md`, `DIJLA_PROJECT_PLAN.md`, and this file inside.
2. Open the folder in Antigravity (or your agent IDE).
3. Tell the agent: *"Read AGENTS.md and PHASE_0_1_BUILD.md, then start Phase 0, task 0.1. Pause after each task for me to confirm."*
4. When a task needs keys or an account action, the agent will pause and ask me.

---

## Manual prerequisites (I do these — the agent cannot)

- [ ] Create a **Supabase** project → copy `Project URL`, `anon key`, and `service_role key`.
- [ ] Create a **Vercel** account (for deploy in task 0.7).
- [ ] Have **Node.js LTS** installed.
- [ ] I will paste keys into `.env.local` myself; the agent must NEVER print or commit secrets.

---

## Ground rules for the agent

- Stack is fixed: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase**. Don't substitute.
- **Arabic-first + full RTL**, mobile-first.
- Never hardcode secrets; use `.env.local`. `service_role` key is **server-only**.
- Multi-tenant everywhere; enforce with **RLS**.
- After each task, print a short summary + the ✅ Acceptance result. Then stop.
- Prefer small, composable components. Data logic in `lib/hooks/`.

---

# PHASE 0 — Foundations

Goal: an installable (PWA), deployable empty app with DB, auth, and design system wired up.

### 0.1 — Scaffold the app
- Create a Next.js App Router project with TypeScript, ESLint, Tailwind, `src/` dir, import alias `@/*`.
  - `npx create-next-app@latest dijla --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Create the folder structure from `DIJLA_PROJECT_PLAN.md` §7 (empty placeholder files where needed).
- Add a clean `.gitignore` (must include `.env*`).
- **✅ Acceptance:** `npm run dev` shows the app on localhost with no errors.

### 0.2 — UI system: shadcn/ui + RTL + Arabic + tokens
- Init shadcn/ui: `npx shadcn@latest init` (choose the defaults matching Tailwind).
- Add base components: `button input label card dialog dropdown-menu sonner (toast) form select switch table tabs`.
- Set `<html lang="ar" dir="rtl">` in the root layout.
- Load an Arabic-friendly font (e.g. Cairo or IBM Plex Sans Arabic) via `next/font`.
- Define design tokens in `tailwind.config.ts` (brand color, radius, spacing) and a small theme.
- **✅ Acceptance:** a demo page renders shadcn components correctly in RTL Arabic.

### 0.3 — Supabase clients + env
- Install `@supabase/supabase-js` and `@supabase/ssr`.
- Create `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server, cookie-based).
- Add `.env.local` keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. Add a `.env.example` (no real values).
- **✅ Acceptance:** a test server action can read from Supabase without exposing the service_role key to the client.

### 0.4 — Database schema + RLS
- Create `supabase/migrations/0001_init.sql` with the schema below and apply it to the Supabase project.
- Enable RLS on all tenant tables and add policies (tenant isolation + driver-only order access + public read of menu/tables by slug/qr_token).
- After migration, generate TypeScript types into `lib/supabase/types.ts`.

<details><summary>0001_init.sql (schema — from DIJLA_PROJECT_PLAN.md §8)</summary>

```sql
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
```
</details>

<details><summary>0002_rls.sql (row-level security — starter policies)</summary>

```sql
-- helper: current user's restaurant
create or replace function current_restaurant_id() returns uuid
language sql stable as $$
  select restaurant_id from profiles where id = auth.uid()
$$;

-- enable RLS
alter table restaurants       enable row level security;
alter table profiles          enable row level security;
alter table tables            enable row level security;
alter table menu_categories   enable row level security;
alter table menu_items        enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table subscriptions     enable row level security;

-- tenant staff/owner can manage their own restaurant's data
create policy tenant_restaurants on restaurants
  for all using (id = current_restaurant_id());

create policy tenant_menu_categories on menu_categories
  for all using (restaurant_id = current_restaurant_id());

create policy tenant_menu_items on menu_items
  for all using (restaurant_id = current_restaurant_id());

create policy tenant_tables on tables
  for all using (restaurant_id = current_restaurant_id());

create policy tenant_orders on orders
  for all using (restaurant_id = current_restaurant_id());

-- drivers: read only orders assigned to them
create policy driver_orders on orders
  for select using (driver_id = auth.uid());

-- profiles: user reads their own row
create policy own_profile on profiles
  for all using (id = auth.uid() or restaurant_id = current_restaurant_id());
```
> Note: public (unauthenticated) reads of menu/tables by `slug`/`qr_token` for the customer pages will be added in Phase 2 via dedicated read policies or a public API route. Keep write access closed to tenants only.
</details>

- **✅ Acceptance:** all tables exist in Supabase; RLS is on; `lib/supabase/types.ts` is generated.

### 0.5 — Auth scaffolding
- Implement Supabase Auth helpers: `signInWithOtp` (phone), email/password fallback, `signOut`, and a `getUser()` server helper.
- Add `middleware.ts` to protect `/dashboard/*`, `/driver/*`, `/admin/*` (redirect unauthenticated users to `/login`).
- **✅ Acceptance:** visiting `/dashboard` while logged out redirects to `/login`.

### 0.6 — PWA (installable like dealshop-iq)
- Add `public/manifest.json` (name "Dijla", `display: standalone`, theme/background colors, `start_url: "/"`, icons).
- Add app icons in `public/icons/` (192, 512, maskable).
- Register a service worker (via `next-pwa` or a manual `sw.js`) to cache the app shell for offline load.
- Add a custom **"Add to Home Screen"** prompt component (`beforeinstallprompt` for Android/Chrome; an iOS Safari instructions banner).
- **✅ Acceptance:** Chrome shows the install option; the app opens standalone after install.

### 0.7 — Base layout + deploy
- Build a minimal shared layout (header, RTL nav placeholder, toaster).
- Push to GitHub; connect the repo to **Vercel**; set env vars in Vercel; deploy.
- **✅ Acceptance:** the empty app is live on a Vercel URL and installable on a phone.

**Phase 0 done when:** installable empty app is deployed, DB + RLS live, auth-protected routes redirect correctly.

---

# PHASE 1 — Menu engine + Restaurant onboarding

Goal: a restaurant can register and build its full menu. (No customer ordering yet.)

### 1.1 — Auth pages
- Build `/login` and `/signup` (Arabic, RTL): phone OTP primary, email fallback.
- On first login, if the user has no `profile`, send them to onboarding (1.2).
- **✅ Acceptance:** I can create an account and log in.

### 1.2 — Restaurant onboarding
- `/onboarding`: form to create a `restaurant` (name, auto-generate unique `slug`, phone, area/city, logo upload) and create the owner `profile` (role `owner`, linked to the restaurant).
- Do the insert in a server action; set `profiles.restaurant_id`.
- **✅ Acceptance:** after onboarding, a `restaurants` row + owner `profiles` row exist and the user lands on `/dashboard`.

### 1.3 — Dashboard shell
- Protected `/dashboard` layout: sidebar/nav (Orders, Menu, Tables, Drivers, Reports, Settings — most disabled until later phases), header with restaurant name + logout.
- **✅ Acceptance:** logged-in owner sees the dashboard shell scoped to their restaurant.

### 1.4 — Image storage
- Create a Supabase **Storage** bucket `menu-images` (public read, authenticated write).
- Reusable `ImageUpload` component that uploads and returns a public URL.
- **✅ Acceptance:** an uploaded image returns a working public URL.

### 1.5 — Menu categories CRUD
- `/dashboard/menu`: list, create, rename, reorder (`sort_order`), activate/deactivate categories. All scoped by `restaurant_id` (RLS enforced).
- **✅ Acceptance:** I can add/edit/reorder categories; they persist and are tenant-isolated.

### 1.6 — Menu items CRUD
- Under each category: create/edit items (name, description, price, image via 1.4, `is_available` sold-out toggle, `sort_order`).
- Optional: option groups/options (sizes, extras) — scaffold only if quick; otherwise defer.
- **✅ Acceptance:** I can build a full menu with photos and prices, toggle sold-out, and reorder items.

### 1.7 — Restaurant settings
- `/dashboard/settings`: edit profile (name, logo, phone, area), open hours, and `delivery_fee`.
- **✅ Acceptance:** settings save and reflect immediately.

**Phase 1 done when:** a brand-new restaurant can sign up, onboard, and build its complete menu — all data isolated per tenant via RLS.

---

## After Phases 0 & 1

Next is **Phase 2 — dine-in QR ordering** (tables + QR generation, customer menu page, live order feed with sound). Do not start delivery or the driver app before Phase 2 works with real restaurants. See `DIJLA_PROJECT_PLAN.md` §9.
