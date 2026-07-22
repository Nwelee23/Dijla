# Dijla — Phase 5 Build Brief: Reports, Subscriptions, Super-Admin & Polish

This file is written so an **agent IDE (Antigravity, Cursor, or Claude Code)** can execute it step by step. Work top to bottom.
Do each task, then check its **✅ Acceptance** before moving on.

> Context: `AGENTS.md` (project memory) + `DIJLA_PROJECT_PLAN.md` (full plan, §9 Phase 5).
> Goal of this phase: turn a working pilot product into a **sellable, self-serve** product you can grow beyond the first 10 restaurants.

---

## Prerequisites (must be true before starting)

- [ ] **Phases 0–4 are done and running in real restaurants:** menu, dine-in QR, direct delivery, and the driver loop all work end to end.
- [ ] You've run the pilot and restaurants are actually placing real orders.

---

## Ground rules (reminder — read `AGENTS.md` for the rest)

- Multi-tenant + RLS everywhere. **Aggregate reports server-side** (SQL/RPC), never by pulling all rows to the client.
- The **super-admin** (`role='admin'`) is you, the platform owner — cross-tenant. Everyone else stays scoped to their own restaurant.
- No payment gateway yet (that's Phase 6): subscription status is set **manually** for now.
- Secrets in `.env.local`; service_role never reaches the client. Pause for approval before running any migration. After each task, print a summary + ✅ result, then stop.

---

## What Phase 5 delivers

1. **Reports** so a restaurant can see its sales, top items, and cash.
2. **Subscription tiers** enforced cleanly across the app, with a trial lifecycle.
3. A **super-admin panel** so you can manage every restaurant and see who paid.
4. **Polish** — performance, offline resilience, error/empty states, RTL — and **self-serve onboarding** so restaurants can start without you.

---

# PHASE 5 — Tasks

### 5.1 — Sales & reports (restaurant dashboard)
- Apply migration `0006_phase5.sql` (below): reporting indexes + a `restaurant_sales_summary` RPC.
- `/dashboard/reports`: a date-range picker (today / 7 days / 30 days / custom) showing: total revenue, order count, average order value, split by type (dine-in / delivery / pickup), **top items**, and busiest hours. Use the RPC + a couple of small aggregate queries — do **not** fetch all orders to the browser.
- **✅ Acceptance:** the owner sees accurate revenue, order count, average, top items, and type split for any chosen range.

<details><summary>0006_phase5.sql</summary>

```sql
-- reporting indexes
create index if not exists idx_orders_rest_created         on orders (restaurant_id, created_at);
create index if not exists idx_orders_rest_status_created  on orders (restaurant_id, status, created_at);
create index if not exists idx_order_items_order           on order_items (order_id);

-- sales summary for a restaurant over a time range (RLS still scopes to the caller's tenant)
create or replace function restaurant_sales_summary(rid uuid, from_ts timestamptz, to_ts timestamptz)
returns table (order_count bigint, revenue numeric, avg_order numeric, cash_collected numeric)
language sql stable as $$
  select
    count(*)                        as order_count,
    coalesce(sum(total), 0)         as revenue,
    coalesce(avg(total), 0)         as avg_order,
    coalesce(sum(cash_collected),0) as cash_collected
  from orders
  where restaurant_id = rid
    and status <> 'cancelled'
    and created_at >= from_ts
    and created_at <  to_ts;
$$;
```
</details>

### 5.2 — Cash reconciliation (extend Phase 4)
- Build on the per-driver daily cash from Phase 4: per-day and per-driver **expected vs collected**, with a printable/exportable end-of-day summary.
- **✅ Acceptance:** the owner can reconcile cash per driver per day and print a daily summary.

### 5.3 — Subscription tiers enforced cleanly
- Centralize the tier gate in one place (e.g. `lib/subscription.ts`): **basic** = dine-in QR only; **pro** = adds delivery + driver dispatch.
- Lifecycle: `trial → active → past_due → cancelled`. Show current tier + status + **days left** in the dashboard; show upgrade prompts wherever a pro feature is gated (delivery link, driver features).
- Activation is **manual** for now (set via the admin panel in 5.4).
- **✅ Acceptance:** features unlock/lock correctly by tier everywhere; the trial countdown and upgrade prompts are consistent; no gated feature leaks to a basic tenant.

### 5.4 — Super-admin panel `/admin`
- Protected, **admin-only** (`role='admin'`); no non-admin can reach it (extend middleware).
- Seed the first admin (you) securely — set your own profile's `role='admin'` via a one-off SQL update (documented, not exposed in the UI).
- Manage restaurants (tenants): list + search, view details, **activate/suspend**, set subscription **tier/status** and **trial dates**, and see basic usage (order count, last active).
- **✅ Acceptance:** you can view every restaurant, change its tier/status, and suspend/activate it; nobody else can open `/admin`.

### 5.5 — Admin metrics overview
- An admin home with platform KPIs: total restaurants, active vs trial vs cancelled, total orders across the platform, an **MRR estimate** (sum of active subscription amounts), and recent signups.
- **✅ Acceptance:** the admin dashboard shows accurate platform-level KPIs.

### 5.6 — Performance & data volume
- Paginate long lists (orders, items, reports); lazy-load images; cache menu reads on customer pages; ensure Realtime subscriptions are tightly scoped and cleaned up on unmount. Move any slow report query to an RPC/view.
- **✅ Acceptance:** dashboards, customer pages, and reports stay fast with realistic data volumes; no unbounded "select all" queries.

### 5.7 — Offline resilience & error states
- Global handling: reconnect banners, retry, safe optimistic UI, friendly Arabic empty states, 404/500 pages, and form validation.
- The order dashboard and driver app must **resync on reconnect** and never silently miss an order after a network drop.
- **✅ Acceptance:** the app degrades gracefully offline and recovers on reconnect; no blank or broken screens.

### 5.8 — RTL & UX polish
- Full RTL audit, consistent Iraqi-Arabic copy, spacing/typography, loading skeletons, tap-target sizes, contrast/accessibility basics, and finalized PWA icons/splash.
- **✅ Acceptance:** the product looks and reads clean and professional in Arabic RTL on a phone.

### 5.9 — Security & data-safety review
- Verify **RLS on every table**; confirm **no PII (phone/coordinates) in any URL**; confirm the **service_role key never reaches the client**; add **rate limiting** to the public order-creation endpoints (`/api/orders`) to prevent spam/abuse on `/r` and `/t`; validate all inputs; re-check role gates across dashboard / driver / admin.
- **✅ Acceptance:** a security pass confirms tenant isolation, role gating, no secret/PII leakage, and basic abuse protection on public endpoints.

### 5.10 — Self-serve onboarding
- Smooth the path: signup → onboarding → build menu → print QR → go live, with a short **getting-started checklist** in-app, so a restaurant can onboard **without you**.
- **✅ Acceptance:** a brand-new restaurant can self-onboard end to end and take its first order unaided.

---

## Definition of done (Phase 5)

- [ ] Restaurants see accurate sales, top items, type split, and cash reports for any range.
- [ ] Cash reconciles per driver per day with a printable summary.
- [ ] Tiers (basic/pro) gate features consistently; trial countdown + upgrade prompts work.
- [ ] You (admin) can manage every tenant's tier/status and see platform KPIs; nobody else can access `/admin`.
- [ ] The app is fast, resilient offline, polished in RTL, and passes a security/PII review.
- [ ] A new restaurant can self-onboard and go live without your help.

**When all boxes are checked:** Dijla is a sellable, self-serve SaaS. You can move from hand-holding pilots to scaling sign-ups across Najaf and beyond.

---

## After Phase 5

**Phase 6 — growth features (after product-market fit):** Iraqi wallet payments (FIB / Qi / ZainCash), WhatsApp/SMS order confirmations + loyalty/marketing, the **Najaf catering / bulk-order module** (the pilgrimage opportunity), and a **B2B supply** add-on. See `DIJLA_PROJECT_PLAN.md` §9. Want me to prepare Phase 6 in this same format when you're ready.
