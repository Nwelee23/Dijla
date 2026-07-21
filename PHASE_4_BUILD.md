# Dijla — Phase 4 Build Brief: Driver App + Dispatch

This file is written so an **agent IDE (Antigravity, Cursor, or Claude Code)** can execute it step by step. Work top to bottom.
Do each task, then check its **✅ Acceptance** before moving on.

> Context: `AGENTS.md` (project memory) + `DIJLA_PROJECT_PLAN.md` (full plan, §9 Phase 4).
> This closes the **own-fleet delivery loop**: assign → driver navigates → delivered → cash collected, all synced live.

---

## Prerequisites (must be true before starting)

- [ ] **Phase 3 is done and running in real restaurants:** direct delivery ordering works, delivery orders land live on the dashboard with pin + Navigate + call, statuses go through `delivered`.
- [ ] Restaurants are already handing delivery orders to their own drivers **manually**. This phase automates that handoff.

---

## Ground rules (reminder — read `AGENTS.md` for the rest)

- Drivers are `profiles` with `role='driver'` belonging to one restaurant. The RLS `driver_orders` policy already lets a driver **read** only orders where `driver_id = auth.uid()`.
- **Driver writes (status, cash) go through a server route** that validates `order.driver_id = auth.uid()` and **whitelists** the fields a driver may change (status transitions, `cash_collected`, `payment_status`). RLS can't restrict columns, so never let the driver update the row directly. Same no-trust-the-client rule as before.
- Multi-tenant + RLS everywhere. COD only. Secrets in `.env.local`.
- Pause for my approval before running any migration. After each task, print a summary + ✅ result, then stop.

---

## What Phase 4 delivers

The restaurant assigns a ready delivery order to one of its own drivers → the order pushes **live** to that driver's phone (installed as a PWA) → the driver taps **Navigate** to the customer's pin, **calls** if needed, marks **Picked up** then **Delivered**, and records **cash collected** → every status syncs back to the dashboard and the customer in real time.

The flow (from `DIJLA_PROJECT_PLAN.md`): **Dashboard (assign) → Driver app → customer + dashboard (live status).**

---

# PHASE 4 — Tasks

### 4.1 — Driver invites & management (dashboard)
- Apply migration `0005_phase4.sql` (below): a `driver_invites` table (restaurant pre-registers a driver by phone before their first login).
- `/dashboard/drivers`: owner adds a driver (`full_name` + `phone`) → creates a `driver_invites` row for this restaurant. List drivers (active profiles with `role='driver'`) with their `driver_status`; allow activate/deactivate.
- **✅ Acceptance:** owner can pre-register a driver by phone and see the restaurant's driver list.

<details><summary>0005_phase4.sql</summary>

```sql
create table driver_invites (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  full_name     text,
  phone         text not null,
  used          boolean not null default false,
  created_at    timestamptz default now(),
  unique (restaurant_id, phone)
);

alter table driver_invites enable row level security;

-- restaurant staff manage their own invites
create policy tenant_driver_invites on driver_invites
  for all using (restaurant_id = current_restaurant_id());
```
> Note: the invite → profile linking in task 4.2 runs **server-side** (service_role), so it doesn't need an anon policy.
</details>

### 4.2 — Driver login + auto-link + role routing
- Driver logs in with **phone OTP** (same auth as everyone). On first login, a **server step** checks `driver_invites` by phone; if a valid unused invite exists, it creates the driver's `profile` (`role='driver'`, linked `restaurant_id`) and marks the invite `used`.
- Role-based routing (extend middleware): `owner`/`staff` → `/dashboard`, `driver` → `/driver`, `admin` → `/admin`. A driver must not be able to open `/dashboard`.
- **✅ Acceptance:** an invited driver logs in by phone, is linked to the right restaurant, and lands on `/driver` with no access to the dashboard.

### 4.3 — Assign an order to a driver (dashboard)
- On a delivery order card (once `accepted`/`ready`), add an **"Assign driver"** control listing the restaurant's **available** drivers. Assigning sets `orders.driver_id`.
- Allow **reassign / unassign**. The order now shows which driver has it.
- **✅ Acceptance:** owner assigns a delivery order to a driver; the assignment appears on that driver's screen **live**; reassign works.

### 4.4 — Driver app: assigned deliveries list `/driver`
- Protected, **driver-only**. Realtime list of orders where `driver_id = current driver` and status is active (`ready`, `out_for_delivery`). Newest/priority first.
- Each row: customer name, landmark, item count, total, **cash to collect**, and one primary action. Big tap targets — one job at a time.
- New assignment → sound + notification (arm audio on a user gesture, like the dashboard in Phase 2).
- **✅ Acceptance:** the driver sees their assigned deliveries live; a new assignment arrives with a notification.

### 4.5 — Driver order screen (navigate, call, status, cash)
- Order detail: customer name, **tap-to-call** phone, landmark, a map with the pin + a big **Navigate** button (Google Maps deep-link to `lat,lng`), items, total, and **cash to collect**.
- Actions (each via the **server route** in ground rules): **Picked up** (→ `out_for_delivery`), **Delivered** (→ `delivered`), and **Cash collected** (confirm amount → sets `cash_collected`, `payment_status='paid'`).
- Each change writes to `order_status_history` and syncs live to the dashboard + customer.
- **✅ Acceptance:** the driver can navigate, call, mark picked-up/delivered, and record cash; only their own orders are affected; all changes sync live.

### 4.6 — Driver availability (available / busy / offline)
- Driver can toggle `driver_status` (their own `profiles` row — allowed by the existing `own_profile` policy). Optionally auto-set `busy` while they have an active delivery and back to `available` when done.
- The dashboard's assign list shows availability and hides offline drivers.
- **✅ Acceptance:** the driver's availability is visible on the dashboard and respected when assigning.

### 4.7 — Full live loop
- Verify the whole loop syncs via Realtime: **assign** (dashboard → driver), **status/cash** (driver → dashboard + customer). Customer tracking now shows "on the way" and "delivered".
- **✅ Acceptance:** a change on any surface (dashboard, driver, customer) reflects on the others within ~1–2s.

### 4.8 — Basic cash reconciliation
- Dashboard view: per-driver **cash collected today** (sum of `cash_collected` for that driver's `delivered` orders), plus order counts.
- **✅ Acceptance:** the owner sees how much cash each driver collected today.

### 4.9 — Polish, permissions & edge cases
- **Permissions:** drivers can only read/act on their own assigned orders (RLS + the server route both enforce this — verify a driver cannot touch another restaurant's or another driver's order).
- Driver goes **offline** with an active order → dashboard can reassign. Unassigned ready orders are clearly visible to dispatch.
- Driver PWA install works; notifications need the audio gesture.
- Reconnect after network drop; no assignment or status update silently lost.
- **✅ Acceptance:** permission checks pass server-side, reassignment works, and the edge cases are handled.

---

## Definition of done (Phase 4)

- [ ] Owner pre-registers a driver by phone; the driver logs in via OTP and is linked to the restaurant.
- [ ] Owner assigns a ready delivery to an available driver; it pushes live to the driver's phone.
- [ ] Driver navigates to the pin, calls the customer, marks picked-up → delivered, and records cash collected.
- [ ] Status + cash sync live to the dashboard and the customer.
- [ ] A driver can only ever read/act on their own assigned orders (enforced server-side).
- [ ] The dashboard shows per-driver cash collected today.

**When all boxes are checked:** the full own-fleet delivery loop is live end to end — dine-in, direct delivery, and driver dispatch — all commission-free for the restaurant.

---

## After Phase 4

Next is **Phase 5 — reports, subscriptions/billing, super-admin, and polish** (sales/top-items/cash reports, subscription tiers + a super-admin panel to manage tenants and who paid, plus performance, offline resilience, and RTL polish). Then **Phase 6** growth features (Iraqi wallet payments, WhatsApp/SMS, the Najaf catering/bulk module, B2B supply). See `DIJLA_PROJECT_PLAN.md` §9.
