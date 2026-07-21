# Dijla — Project Plan & Build Guide

> A commission-free ordering & operations platform for Iraqi restaurants.
> One system, three surfaces: **Customer** (QR dine-in + direct delivery), **Restaurant dashboard**, **Driver app**.
> No hardware. Web-based, installable on the phone like a native app (PWA) — same approach as *dealshop-iq*.

---

## 1. The Name

**Name: `Dijla` (دجلة)** — the Tigris river, the lifeline of Iraq. Deeply Iraqi and instantly recognizable, evokes *flow* and continuity (fitting for a stream of orders), short, memorable, and brandable in both Arabic and Latin script. Target domains/handles: `dijla-iq` / `dijla.app` (verify availability before locking it in).

The rest of this document uses **Dijla**.

---

## 2. What Dijla Is (the product)

A multi-tenant SaaS. Each restaurant gets its own menu, dashboard, tables, and drivers. The **core engine is built once** (menu + order engine); the only difference between order types is the data that travels with the order:

- **Dine-in order** → carries a **table number**.
- **Delivery order** → carries the **customer's GPS location** + phone.

### The three surfaces
1. **Customer** (no app install): scans a table QR (dine-in) or opens the restaurant's link (delivery) → browses menu → orders. For delivery, the browser captures a GPS pin so there's no need for a formal street address (which Iraq doesn't have).
2. **Restaurant dashboard**: any phone/tablet/laptop the restaurant already owns. Live incoming orders with a sound alert, menu management, table & QR management, driver assignment, daily reports.
3. **Driver app** (the restaurant's *own* drivers, not a third-party fleet): sees assigned deliveries, a "Navigate" button (opens maps to the pin), order details + customer phone, and marks picked-up / delivered / cash-collected.

---

## 3. Why This Idea Is Strong (analysis + my suggestions)

### Strengths
- **Painkiller, not vitamin.** Restaurants pay 15–30% commission to delivery apps. Dijla lets them take orders directly for a low **flat monthly fee** — instant, obvious ROI.
- **Asset-light.** You sell software, not hardware and not a delivery fleet. No inventory, no couriers, low burn. Pure SaaS margins.
- **You don't compete with Baly/Talabat.** You're the "picks and shovels" seller to every restaurant, not another delivery marketplace fighting for customers.
- **Zero-install adoption.** QR → web page. No app-store friction for customers or drivers.
- **Najaf edge.** The pilgrimage economy (esp. Arbaeen) creates huge seasonal demand and bulk/catering needs you understand better than a Baghdad/Erbil startup.

### Risks (and how to handle them)
- **Iraqi addresses don't exist formally** → solve with **GPS pin from the customer's browser** + a "nearest landmark" text field. This is a feature, not a bug.
- **Spotty internet** → design offline-tolerant screens, retry logic, and a sound + visual alert so no order is missed.
- **Trust / getting the first restaurants** → pilot free for 1 month with ~10 restaurants in ONE Najaf area; use their results to sell the rest.
- **Copycats** → your moat is switching cost. Once a restaurant's menu, tables, drivers, and history live in Dijla, leaving is painful. Add loyalty + reports fast to deepen it.

### Key strategic decisions (baked into this plan)
1. **Charge subscription, never commission** — that's the whole pitch.
2. **Build the shared core first**, then layer dine-in → delivery → driver dispatch.
3. **Ship dine-in QR first** (simplest, no location/driver) to hook restaurants, then upsell delivery.
4. **Cash on delivery (COD) for the MVP.** Add Iraqi wallets (Qi/FIB/ZainCash) later.
5. **Arabic-first, RTL, mobile-first** from day one.

---

## 4. Feature List (by surface)

### Customer — Dine-in
- Scan table QR → auto-detects restaurant + table number
- Browse menu by category, item photos, prices, descriptions
- Item options/modifiers (size, extras, notes)
- Cart, quantity, order notes
- Place order (tied to the table)
- "Call waiter" button
- Live order status + view running bill

### Customer — Delivery / Pickup
- Open restaurant link → browse menu → cart
- Enter name + phone
- **Capture location:** GPS pin (one tap) + "nearest landmark" text
- Choose delivery or pickup
- Place order (COD default) → live status tracking

### Restaurant dashboard
- **Live order feed** with sound + visual alert (new / accepted / preparing / ready / out-for-delivery / delivered)
- Accept / reject / update status; separate **kitchen view**
- **Menu management:** categories & items CRUD, price, availability toggle (sold-out), images, sort order
- **Table management:** create tables, auto-generate & print QR codes
- **Driver management:** add drivers, assign orders, see driver status
- **Reports:** daily/weekly sales, top items, order counts, cash reconciliation
- **Settings:** open hours, delivery fee, delivery zones, restaurant profile/logo

### Driver app
- List of assigned deliveries (with priority/time)
- Order details + customer name & phone (tap to call)
- **Navigate** button → opens Google Maps/OSM to the GPS pin
- Status: picked up → delivered
- Mark **cash collected** (amount)

### Platform owner (you) — Super Admin
- Manage restaurants (tenants): create, activate/suspend
- Manage subscriptions & tiers, see who paid
- Basic usage analytics across all restaurants

### Cross-cutting
- **PWA install** ("Add to Home Screen") for all three surfaces
- Arabic-first RTL UI, mobile-first
- Role-based access (owner / staff / driver / super-admin)
- Multi-tenant data isolation (a restaurant only ever sees its own data)

---

## 5. Recommended Tech Stack (and why)

Optimized for a **solo/small founder** who needs to ship fast, cheaply, with **real-time order updates** and **PWA** support.

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js (React) + TypeScript** | One codebase for all surfaces + marketing site + API routes; excellent PWA support; SSR for fast mobile loads |
| **Styling / UI** | **Tailwind CSS + shadcn/ui** | Fast, mobile-first, easy RTL, clean components out of the box |
| **Backend + DB** | **Supabase (PostgreSQL)** | Gives you Postgres **+ Auth + Realtime + Storage + Row-Level Security** in one. Realtime = live order dashboard for free. Cuts backend work massively |
| **Auth** | **Supabase Auth (phone OTP + email)** | Phone OTP fits Iraq — everyone has a phone number |
| **Realtime** | **Supabase Realtime** | Dashboard subscribes to new orders; driver subscribes to assigned orders |
| **Storage** | **Supabase Storage** | Menu item images, restaurant logos |
| **Maps / location** | **Browser Geolocation API + Leaflet + OpenStreetMap** | Free; capture the customer pin, render it, deep-link to Google Maps for navigation (avoid paid Maps API early) |
| **QR codes** | `qrcode` (npm) | Generate table QRs and delivery links |
| **Hosting** | **Vercel** (frontend) + **Supabase** (backend) | Generous free tiers, near-zero DevOps, scales when you grow |
| **PWA** | `next-pwa` / manifest + service worker | Installable on phone like a native app (same as dealshop-iq) |
| **Payments (later)** | COD first → **FIB / Qi / ZainCash** APIs | Don't build payments in the MVP |
| **Notifications (later)** | Web Push → **WhatsApp Business API / SMS** | Order confirmations & marketing |

**Alternatives:** Firebase instead of Supabase (great realtime, but non-relational — Postgres suits this relational data better). Plain React + Vite + a Node/Express + Postgres backend if you want full control (more work). For a first version, **Next.js + Supabase is the fastest safe path.**

---

## 6. UI/UX Principles

- **Mobile-first, thumb-friendly.** ~75% of Iraqi traffic is mobile.
- **Arabic-first, full RTL.** Native Iraqi Arabic copy, not Levantine/Gulf.
- **3-tap rule:** customer should place an order in ≤3 taps from opening the menu.
- **Big photos, big buttons, minimal typing** — especially for delivery.
- **Dashboard = glanceable.** New order must be impossible to miss: loud sound + full-screen banner + color.
- **Driver screen = one job at a time.** Current delivery front and center, giant Navigate + Call buttons.
- **Offline states everywhere** ("reconnecting…"), never a blank/broken screen.
- Consistent design tokens (colors, spacing, radius) via Tailwind config.

---

## 7. Project Structure

```
dijla/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # public landing + pricing
│   ├── r/[slug]/                 # CUSTOMER: restaurant menu (delivery link)
│   │   ├── page.tsx              # menu + cart
│   │   └── checkout/             # location capture, place order
│   ├── t/[table_token]/          # CUSTOMER: dine-in menu via table QR
│   ├── dashboard/                # RESTAURANT (auth-protected)
│   │   ├── orders/               # live order feed + kitchen view
│   │   ├── menu/                 # menu CRUD
│   │   ├── tables/               # tables + QR generation
│   │   ├── drivers/              # driver management + assignment
│   │   ├── reports/              # sales reports
│   │   └── settings/             # profile, hours, delivery fee/zones
│   ├── driver/                   # DRIVER app (auth-protected)
│   │   └── deliveries/           # assigned deliveries + navigate/status
│   ├── admin/                    # SUPER ADMIN (platform owner)
│   │   ├── restaurants/          # tenants
│   │   └── subscriptions/        # billing/tiers
│   └── api/                      # server routes (webhooks, QR, etc.)
├── components/                   # shared UI (shadcn/ui + custom)
│   ├── menu/  cart/  orders/  ui/
├── lib/
│   ├── supabase/                 # client + server + types
│   ├── hooks/                    # useRealtimeOrders, useCart, useGeolocation
│   ├── qr.ts                     # QR generation
│   └── utils.ts
├── supabase/
│   ├── migrations/               # SQL schema (see section 8)
│   └── policies/                 # RLS policies
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # service worker
│   └── icons/                    # PWA icons
├── styles/
├── .env.local                    # SUPABASE_URL, SUPABASE_ANON_KEY, etc.
├── tailwind.config.ts
└── next.config.js
```

---

## 8. Database Schema (PostgreSQL / Supabase)

All the tables. Multi-tenant: nearly every row carries a `restaurant_id`, and **Row-Level Security (RLS)** guarantees a restaurant only sees its own data.

```sql
-- ============ TENANTS ============
create table restaurants (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text unique not null,          -- used in /r/[slug]
  logo_url       text,
  phone          text,
  area           text,                          -- e.g. "Najaf - Old City"
  lat            double precision,
  lng            double precision,
  delivery_fee   numeric(10,2) default 0,
  currency       text default 'IQD',
  is_active      boolean default true,
  settings       jsonb default '{}'::jsonb,     -- hours, zones, flags
  created_at     timestamptz default now()
);

-- ============ USERS / STAFF / DRIVERS ============
-- linked to Supabase auth.users via id
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  restaurant_id  uuid references restaurants(id) on delete cascade,
  full_name      text,
  phone          text,
  role           text not null check (role in ('owner','staff','driver','admin')),
  driver_status  text check (driver_status in ('available','busy','offline')),
  is_active      boolean default true,
  created_at     timestamptz default now()
);

-- ============ TABLES (dine-in) ============
create table tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  table_number   text not null,                 -- "5", "A2"
  label          text,
  qr_token       text unique not null,          -- used in /t/[qr_token]
  is_active      boolean default true,
  created_at     timestamptz default now()
);

-- ============ MENU ============
create table menu_categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  name           text not null,
  sort_order     int default 0,
  is_active      boolean default true
);

create table menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  category_id    uuid references menu_categories(id) on delete set null,
  name           text not null,
  description    text,
  price          numeric(10,2) not null,
  image_url      text,
  is_available   boolean default true,          -- sold-out toggle
  sort_order     int default 0,
  created_at     timestamptz default now()
);

-- optional: item options / modifiers (sizes, extras)
create table option_groups (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references menu_items(id) on delete cascade,
  name           text not null,                 -- "Size", "Extras"
  is_required    boolean default false,
  max_select     int default 1
);
create table options (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references option_groups(id) on delete cascade,
  name           text not null,                 -- "Large", "Extra cheese"
  price_delta    numeric(10,2) default 0
);

-- ============ ORDERS ============
create table orders (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  order_number      int not null,               -- per-restaurant sequence
  type              text not null check (type in ('dine_in','delivery','pickup')),
  status            text not null default 'new'
                    check (status in ('new','accepted','preparing','ready',
                                      'out_for_delivery','delivered','cancelled')),
  table_id          uuid references tables(id),          -- dine-in only
  customer_name     text,
  customer_phone    text,
  customer_lat      double precision,                    -- delivery pin
  customer_lng      double precision,
  customer_landmark text,                                -- "near Al-Noor pharmacy"
  delivery_notes    text,
  driver_id         uuid references profiles(id),
  subtotal          numeric(10,2) not null default 0,
  delivery_fee      numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  payment_method    text default 'cash' check (payment_method in ('cash','wallet')),
  payment_status    text default 'unpaid' check (payment_status in ('unpaid','paid')),
  cash_collected    numeric(10,2),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  menu_item_id    uuid references menu_items(id),
  name_snapshot   text not null,                 -- name at time of order
  price_snapshot  numeric(10,2) not null,        -- price at time of order
  quantity        int not null default 1,
  options_snapshot jsonb default '[]'::jsonb,     -- chosen options
  notes           text
);

-- audit trail of status changes
create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  status      text not null,
  changed_by  uuid references profiles(id),
  created_at  timestamptz default now()
);

-- ============ BILLING ============
create table subscriptions (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  tier           text not null check (tier in ('basic','pro')),
  status         text not null default 'trial'
                 check (status in ('trial','active','past_due','cancelled')),
  amount         numeric(10,2),
  start_date     date,
  end_date       date,
  created_at     timestamptz default now()
);

-- helpful indexes
create index on orders (restaurant_id, status);
create index on orders (restaurant_id, created_at desc);
create index on menu_items (restaurant_id, category_id);
create index on profiles (restaurant_id, role);
```

### Row-Level Security (multi-tenancy) — the rule
Enable RLS on every table and add policies so a user only touches rows where `restaurant_id` matches their own `profiles.restaurant_id`. Customer-facing menu reads (menu, categories, tables) are public **read-only** by `slug`/`qr_token`; everything else is restricted by tenant + role.

```sql
alter table orders enable row level security;

-- staff/owner see only their restaurant's orders
create policy "tenant_orders" on orders
  for all using (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
  );

-- drivers see only orders assigned to them
create policy "driver_orders" on orders
  for select using (driver_id = auth.uid());
```

---

## 9. Build Plan — Phases 0 → 100

Each phase ends with something **shippable and sellable**. You start earning subscriptions after Phase 2.

### Phase 0 — Foundations (setup)
- Create Next.js + TypeScript + Tailwind + shadcn/ui project
- Create Supabase project; run the schema (Section 8) as a migration; enable RLS
- Set up Supabase Auth (phone OTP + email)
- Build the design system (RTL, colors, base components)
- **PWA shell:** `manifest.json`, service worker, install prompt, app icons
- Deploy an empty app to Vercel (CI works end-to-end)
- **Deliverable:** installable empty app, DB live, auth working.

### Phase 1 — Menu engine + Restaurant onboarding
- Restaurant sign-up / login; create `restaurant` + owner `profile`
- Menu management: categories + items CRUD, image upload, availability toggle
- Restaurant settings: profile, logo, hours, delivery fee
- **Deliverable:** a restaurant can register and build its full menu.

### Phase 2 — Dine-in QR ordering (first money)
- Table management + **QR generation** (printable) → `/t/[qr_token]`
- Customer menu page (from QR): browse, cart, options, place order (tied to table)
- **Live order feed** on dashboard with sound alert (Supabase Realtime)
- Accept / update status; kitchen view
- **Deliverable:** full dine-in flow. Start the 10-restaurant Najaf pilot. Begin charging **basic** subscription.

### Phase 3 — Delivery direct ordering (the commission-killer)
- Public restaurant link `/r/[slug]` → menu → cart
- Checkout: name, phone, **GPS pin capture** + landmark, delivery/pickup
- Delivery orders land in the dashboard; restaurant hands to its **existing** driver manually (as they do today — but now digital, no commission)
- **Deliverable:** restaurants take delivery orders commission-free → upsell to **pro** tier.

### Phase 4 — Driver app + dispatch
- Driver login; driver list on dashboard
- Assign an order to a driver → pushes to driver app
- Driver screen: details, **Navigate** (maps deep-link to pin), call, mark picked-up/delivered, cash collected
- Order status syncs live to customer + dashboard
- **Deliverable:** full own-fleet delivery loop.

### Phase 5 — Reports, billing, admin, polish
- Sales/reports (daily/weekly, top items, cash reconciliation)
- Subscriptions & tiers; Super-Admin panel to manage tenants + who paid
- Performance, offline resilience, empty/error states, RTL polish
- **Deliverable:** a sellable, self-serve product beyond the pilot.

### Phase 6 — Growth features (after product-market fit)
- Iraqi wallet payments (FIB / Qi / ZainCash)
- WhatsApp/SMS order confirmations + marketing/loyalty
- Catering / bulk orders module (the **Najaf pilgrimage** opportunity)
- B2B supply add-on

---

## 10. PWA — "install on phone like an app" (the dealshop-iq part)

1. Add `public/manifest.json` (name, icons, `display: "standalone"`, theme color, start URL).
2. Register a **service worker** (via `next-pwa`) to cache the shell and enable offline loading.
3. Show a custom **"Add to Home Screen"** prompt (`beforeinstallprompt` on Android/Chrome; instructions banner for iOS Safari).
4. Provide all icon sizes in `public/icons/`.

Result: customers, restaurant staff, and drivers all "install" Dijla from the browser — no app store, exactly like dealshop-iq.

---

## 11. Launch / Pilot Plan (Najaf)

1. Pick **one area** (e.g. around the shrine or one street) and **10 restaurants**.
2. Offer **1 month free** in exchange for feedback + a testimonial.
3. Onboard them personally (build their menu with them the first time).
4. Measure ONE number: **did they renew (pay) after the free month?**
5. If yes → you have a business. Use their results to sell the next 40. If no → fix the product before scaling.

---

## 12. Monetization

- **Basic tier:** QR menu + dine-in ordering (cheap entry — e.g. a low flat monthly fee).
- **Pro tier:** adds direct delivery + driver dispatch + reports (higher fee).
- Flat subscription **only** — never a per-order commission. That's the entire value proposition vs. Talabat/Baly.
- Later add-ons: catering/bulk module, B2B supply, marketing/loyalty — each a new revenue line to the same restaurants you already own the relationship with.

---

## 13. Immediate Next Steps

1. Lock the name (`Dijla` or an alternative) and grab the domain + social handles.
2. Scaffold the repo (Phase 0).
3. Stand up the Supabase project + run the schema.
4. Build Phases 1–2 (menu + dine-in QR).
5. Line up your first 10 Najaf restaurants for the pilot.

> Suggested build order to hand to a coding tool (Antigravity / Cursor / Claude Code): follow Phases 0 → 5 in order; do not build delivery (Phase 3) or the driver app (Phase 4) before dine-in (Phase 2) is working and in real restaurants.
