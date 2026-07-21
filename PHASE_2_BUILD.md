# Dijla — Phase 2 Build Brief: Dine-in QR Ordering

This file is written so an **agent IDE (Antigravity, Cursor, or Claude Code)** can execute it step by step. Work top to bottom.
Do each task, then check its **✅ Acceptance** before moving on.

> Context: `AGENTS.md` (project memory) + `DIJLA_PROJECT_PLAN.md` (full plan, §9 Phase 2).
> **This is the first money phase** — when it works, you start the pilot and begin charging the basic subscription.

---

## Prerequisites (must be true before starting)

- [ ] **Phase 0 & Phase 1 are done:** app deploys, DB + RLS live, auth works, a restaurant can register and build a full menu.
- [ ] At least one test restaurant with categories + items exists in the database.

If any of the above is false, finish `PHASE_0_1_BUILD.md` first.

---

## Ground rules (reminder — read `AGENTS.md` for the rest)

- Stack is fixed: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase**. Arabic-first, RTL, mobile-first.
- **Multi-tenant + RLS everywhere.** A user only touches their own restaurant's data.
- **Never trust the client.** Customer pages are anonymous — recompute all prices/totals **server-side** from the database. Never accept a price sent by the browser.
- **Order creation for anonymous customers goes through a server route** using the Supabase **service_role** key (server-only). Validate that the table and every item belong to the restaurant.
- Secrets stay in `.env.local`. Pause for my approval before running any DB migration.
- After each task, print a short summary + the ✅ Acceptance result, then stop.

---

## What Phase 2 delivers

A diner scans the QR on their table → sees the restaurant's menu in Arabic on their phone → orders → the order appears **live with a sound** on the restaurant dashboard → staff update the status → the diner sees it update. No delivery, no drivers yet.

The flow (from `DIJLA_PROJECT_PLAN.md`): **Customer (table QR) → Restaurant dashboard → Kitchen.**

---

# PHASE 2 — Tasks

### 2.1 — Public (anonymous) read access for customer pages
Customer pages are unauthenticated, so add tight **read-only** access for active data, keep all writes closed.

- Apply migration `0003_phase2.sql` (below): public `SELECT` policies for active restaurants, active categories, available items, and active tables; plus the per-restaurant order-number counter.
- In customer-facing queries, **select only the columns the page needs** (never `settings` or anything sensitive).
- **✅ Acceptance:** an anonymous request can read a restaurant's menu by `slug` and resolve a table by `qr_token`, but cannot read another restaurant's private data and cannot write anything.

<details><summary>0003_phase2.sql</summary>

```sql
-- ---- public read policies (additive to existing tenant policies) ----
create policy public_read_restaurants on restaurants
  for select using (is_active = true);

create policy public_read_categories on menu_categories
  for select using (is_active = true);

create policy public_read_items on menu_items
  for select using (is_available = true);

create policy public_read_tables on tables
  for select using (is_active = true);

-- ---- per-restaurant order number counter (race-safe) ----
create table order_counters (
  restaurant_id uuid primary key references restaurants(id) on delete cascade,
  last_number   int not null default 0
);

create or replace function next_order_number(rid uuid) returns int
language plpgsql as $$
declare n int;
begin
  insert into order_counters (restaurant_id, last_number)
    values (rid, 1)
  on conflict (restaurant_id)
    do update set last_number = order_counters.last_number + 1
  returning last_number into n;
  return n;
end;
$$;
```
> Note: writes stay closed for anonymous users (there is no anon INSERT/UPDATE policy). Order creation happens only through the server route in task 2.5.
</details>

### 2.2 — Table management (dashboard)
- `/dashboard/tables`: list, create, edit, activate/deactivate tables (`table_number`, optional `label`).
- On create, auto-generate a unique `qr_token` (use `nanoid`), scoped to the restaurant.
- **✅ Acceptance:** owner can manage tables; every table has a unique `qr_token`; data is tenant-isolated.

### 2.3 — QR code generation + printable sheet
- For each table, build the URL `https://<APP_DOMAIN>/t/<qr_token>` and render a QR (use the `qrcode` package). Read the domain from an env var.
- Per-table: "Download PNG" and "Print". Plus a **"Print all"** page: a clean grid of all QR codes each labeled with its table number, sized for A4, so the restaurant prints once and places them on tables.
- **✅ Acceptance:** owner can print a QR per table; scanning a printed QR opens the correct table's menu page.

### 2.4 — Customer menu page (dine-in) `/t/[qr_token]`
- Resolve `qr_token` → table + restaurant (server component). If missing/inactive, show a friendly Arabic "QR not valid / restaurant closed" screen.
- Render the restaurant header (logo, name), then the menu grouped by category, **available items only**, with photo, name, description, price.
- Item sheet/modal: options/modifiers (if any), quantity, and an item note field.
- Mobile-first, RTL, big tap targets, minimal typing.
- **✅ Acceptance:** scanning a table QR shows that restaurant's live menu on a phone; an invalid token shows the friendly error.

### 2.5 — Cart + place order (server-validated)
- Client cart (`useCart` hook): add/remove/change quantity, item notes, running subtotal.
- "Place order" calls a **server route** `POST /api/orders` that uses the **service_role** client and:
  1. validates the `qr_token` → table → restaurant,
  2. validates every item id belongs to that restaurant and is available,
  3. **recomputes** unit prices and totals from the DB (ignore any client prices),
  4. calls `next_order_number(restaurant_id)`,
  5. inserts the `orders` row (`type='dine_in'`, `table_id`, `status='new'`) and `order_items` with `name_snapshot`, `price_snapshot`, `options_snapshot`,
  6. returns the created `order_number` + order id.
- Optional: a **"Call waiter"** button that inserts a lightweight signal the dashboard can surface (keep simple; a flag or a zero-item event).
- **✅ Acceptance:** placing an order creates the order + items with **server-computed** totals and a correct per-restaurant `order_number`; the customer sees a confirmation.

### 2.6 — Live order feed on the dashboard (Realtime + sound)
- `/dashboard/orders`: subscribe to **Supabase Realtime** on `orders` filtered by this `restaurant_id`.
- A new order → play an alert **sound** + show a prominent banner/card that's impossible to miss. Because browsers block autoplay, add an **"Enable sound"** toggle (arms audio on a user gesture) and show a visual fallback regardless.
- Order card shows: order number, table number, items + notes, time, current status.
- Status actions: `new → accepted → preparing → ready` (and `served`/`completed`). Each change writes to `order_status_history`.
- A simple **kitchen view** tab: just the items to prepare per active order, large text.
- **✅ Acceptance:** an order placed from a phone appears on the dashboard within ~1–2s **with a sound**; status changes update live for all open dashboards.

### 2.7 — Customer live status
- After placing, the customer page shows live status (`new → accepted → preparing → ready`) via Realtime (fallback to polling if needed).
- **✅ Acceptance:** the diner sees the status change without refreshing.

### 2.8 — Minimal subscription/trial state (start charging)
- On restaurant onboarding (from Phase 1), ensure a `subscriptions` row exists with `status='trial'` and a trial end date (e.g. +30 days).
- Dashboard shows **days left in trial**. When the trial ends and status isn't `active`, show a soft "trial ended — contact us to continue" screen (no payment gateway yet; you collect the fee manually during the pilot and flip status to `active`).
- **✅ Acceptance:** a new restaurant gets a 30-day trial; the dashboard shows trial status; an expired trial shows the upgrade prompt.

### 2.9 — Polish & edge cases
- Invalid/inactive QR, empty menu, sold-out items hidden, dashboard reconnect after network drop (Iraqi internet is spotty), and the sound-autoplay gesture.
- Ensure the dashboard **never silently misses an order** (visual badge + count even if sound is off).
- **✅ Acceptance:** the listed edge cases are handled gracefully.

---

## Definition of done (Phase 2)

- [ ] Owner creates tables and prints their QR codes.
- [ ] A diner scans a table QR, browses the Arabic menu, and places an order on their phone.
- [ ] The order appears **live with a sound** on the restaurant dashboard with the correct table number.
- [ ] Staff move the order through statuses; the diner sees updates live.
- [ ] Totals are computed server-side; no client price is trusted; tenant data is isolated.
- [ ] New restaurants get a 30-day trial with a visible countdown.

**When all boxes are checked:** stop building and run the pilot — onboard ~10 Najaf restaurants (start with dine-in), and begin charging the basic subscription. Measure the one number that matters: **did they renew after the free month?**

---

## After Phase 2

Next is **Phase 3 — direct delivery ordering** (`/r/[slug]`, GPS-pin location capture, delivery orders in the dashboard, manual handoff to the restaurant's existing driver). Do not start Phase 3 until Phase 2 is working in **real** restaurants. See `DIJLA_PROJECT_PLAN.md` §9.
