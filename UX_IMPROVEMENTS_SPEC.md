# Dijla — UX Improvements Spec

**Supersession:** this file **extends** (does not replace) `DRIVER_REPORTS_ADMIN_SPEC.md` §A, §B and §C, and `ORDERS_DASHBOARD_SPEC.md` §2–3. Those remain the base specs for their screens; everything here is added on top.

> Read `MASTER_INDEX.md` first. Design system is inherited from `REDESIGN_V2_SPEC.md` §1–3 — do not redefine colours, spacing, or the logo. The non-negotiable rules in `MASTER_INDEX.md` §6 apply throughout.
>
> **Repo migration numbering (important):** every migration in this spec is offset `+1` from the original draft, because `0025` is taken by `0025_menu_payload_options`. The numbers below are repo-correct and match `MASTER_INDEX.md §5`: `item_cost = 0031`, `admin_cohorts = 0032`, `driver_arrival = 0033`.

**Context:** an audit of the built screens found the code well-structured and not primitive — the orders board is a proper three-column kanban with sound alerts, and motion exists across most components. The gaps are uneven polish: the **admin panel has no visualisations at all**, **reports have good data but plain presentation**, and the **driver app is thin**. This file closes those gaps.

**Build order (by value):** A.3 churn risk → B → C.1 → D → A rest → E.

---

# A. Admin panel

Currently pure numbers and lists — no charts anywhere. This is the weakest screen in the product and it is the one you use to make money decisions.

## A.1 Growth chart
A bar or line chart of **new restaurants per month** over the last 12 months, with a toggle for cumulative vs. new. Rendered as inline SVG (no chart library needed for this shape) or with a lightweight library if one is already in the project — do not add a heavy dependency for a single chart.

## A.2 MRR curve
A line chart of **monthly recurring revenue** over time, computed from active subscription amounts, with the current value and the month-over-month change called out above it.

## A.3 Churn-risk list ⭐ *highest value in this file*
`DRIVER_REPORTS_ADMIN_SPEC.md §C.3.1` requires flagging dormant restaurants. Build it out into a real workflow:

- A dedicated **«مطاعم بخطر الانسحاب»** panel on the admin home listing restaurants with **no orders for 7+ days**, sorted by days dormant, showing: name, area, days since last order, tier, subscription status, and lifetime orders.
- **Risk tiers:** 7–13 days = warning, 14+ days = critical.
- Each row has a **tap-to-call** owner phone and a **«تمت المتابعة»** action recording an outreach note and date, so the same restaurant isn't chased twice.
- Exclude restaurants still in their first week (they have no baseline yet) and those already `cancelled`.

**Why:** a restaurant that stops using the product cancels a few weeks later. Calling before they decide is the cheapest revenue you will ever protect.

## A.4 Cohort retention
A table of **signup-month cohorts** versus months since signup, each cell showing the percentage of that cohort still active (placed an order that month). Colour-scale the cells. This one number tells you whether the business model works.

<details><summary>0032_admin_cohorts.sql</summary>

```sql
-- restaurants with no orders in the last N days (admin-only; called with service_role)
create or replace function admin_dormant_restaurants(days int default 7)
returns table (
  restaurant_id uuid, name text, area text, phone text,
  last_order_at timestamptz, days_dormant int, lifetime_orders bigint
)
language sql stable as $$
  select r.id, r.name, r.area, r.phone,
         max(o.created_at) as last_order_at,
         coalesce(extract(day from now() - max(o.created_at))::int, 999) as days_dormant,
         count(o.id) as lifetime_orders
  from restaurants r
  left join orders o on o.restaurant_id = r.id and o.status <> 'cancelled'
  where r.is_active = true
  group by r.id
  having max(o.created_at) < now() - make_interval(days => days)
      or max(o.created_at) is null;
$$;

-- signup-month cohort retention
create or replace function admin_cohort_retention()
returns table (cohort_month date, months_since int, active_count bigint, cohort_size bigint)
language sql stable as $$
  with c as (
    select id, date_trunc('month', created_at)::date as cohort_month
    from restaurants
  ),
  a as (
    select o.restaurant_id, date_trunc('month', o.created_at)::date as active_month
    from orders o where o.status <> 'cancelled'
    group by 1, 2
  )
  select c.cohort_month,
         (extract(year from age(a.active_month, c.cohort_month)) * 12
          + extract(month from age(a.active_month, c.cohort_month)))::int as months_since,
         count(distinct a.restaurant_id) as active_count,
         (select count(*) from c c2 where c2.cohort_month = c.cohort_month) as cohort_size
  from c join a on a.restaurant_id = c.id
  group by 1, 2;
$$;

-- outreach log so the same restaurant isn't chased twice
create table if not exists admin_outreach (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  note          text,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);
alter table admin_outreach enable row level security;
create policy admin_only_outreach on admin_outreach for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
```
</details>

**Security:** every admin RPC is reachable **only** by `role = 'admin'`, enforced server-side as well as in middleware. These functions cross tenant boundaries by design, so nothing below admin may call them.

---

# B. Reports

The hard work is already done — `restaurant_hourly`, top items, and type split all exist as RPCs. The presentation is what's missing.

## B.1 Period comparison
Every KPI tile shows change versus the **equivalent previous period** (7 days vs. the 7 before it), as a signed percentage with direction and colour. Handle the zero-baseline case without showing infinity.

## B.2 Plain-language insights ⭐
Above the charts, render 2–4 **generated Arabic sentences** from the data. Restaurant owners read sentences, not charts. Examples:

- «ذروتك ٧–٩ مساءً · ٤٢٪ من طلباتك»
- «كباب عراقي أكثر أصنافك مبيعاً — ٥٨ طلب هذا الأسبوع»
- «متوسط وقت التحضير ارتفع ٣ دقائق عن الأسبوع الماضي»
- «طلبات التوصيل زادت ١٨٪ — فكّر بسائق إضافي بالذروة»

Rules: template-based from real numbers, never invented; only show an insight when the data actually supports it (enough orders, meaningful change); cap at four; keep each under ~12 words.

## B.3 Charts
Upgrade the peak-hours display to a proper bar chart with hour labels, and give top items proportional bars with counts **and** revenue. Inline SVG is enough.

## B.4 CSV export
Export the selected range as CSV — orders and per-item totals — for the accountant. Arabic-safe encoding (UTF-8 BOM so Excel opens it correctly).

## B.5 Item profitability
Optional `cost` per menu item. Where cost is set, show **margin per item** and rank by **total profit**, not just revenue — the best seller is often not the best earner.

- Cost is entered in the menu builder detail panel and is **entirely optional**; items without cost are simply excluded from the profit view with a hint to add costs.
- Never expose cost or margin on any customer-facing surface.

<details><summary>0031_item_cost.sql</summary>

```sql
alter table menu_items add column if not exists cost numeric(10,2);
```
</details>

---

# C. Driver app

Thin but correct. Three practical additions.

## C.1 Screen wake lock ⭐ *do this first — two lines of code*
The driver's screen currently sleeps while riding. Request a screen wake lock on the deliveries list and the active delivery screen, release it when no delivery is active, and **re-acquire on `visibilitychange`** (the lock is dropped when the tab is backgrounded). Feature-detect and degrade silently where unsupported.

## C.2 Proximity ordering
When a driver holds more than one delivery, sort them by **distance** (haversine from the restaurant, or from the driver's current position when location permission is granted) rather than by time received. Show the distance on each card. Let the driver switch back to «الأقدم أولاً» — sometimes an older order must go first.

## C.3 "Arrived" action
A **«وصلت»** button on the active delivery that stamps `driver_arrived_at` and pushes a live update to the customer's tracking page ("السائق وصل"). Reduces the "where is my order?" calls that interrupt the kitchen.

- Goes through the existing driver server route with the same ownership check and column whitelist — add `driver_arrived_at` to the whitelist, nothing else.
- Leave a clean hook for a WhatsApp/SMS notification later (`PHASE_6_BUILD.md` module B).

<details><summary>0033_driver_arrival.sql — already added to the MASTER_INDEX migration ledger (§5)</summary>

```sql
alter table orders add column if not exists driver_arrived_at timestamptz;
```
</details>

---

# D. Orders board

## D.1 Drag and drop between columns
Let staff drag an order card between the three lanes to advance its status — faster than tapping during a rush. Use whichever drag library the menu reorder already uses; if none exists, add `@dnd-kit`. Requirements:

- **Keep the existing buttons.** Drag is an addition, not a replacement — touch devices and gloved hands need the button.
- Only **forward** transitions are allowed by drag; dragging backwards is rejected with a toast.
- The 10-second undo from `ORDERS_DASHBOARD_SPEC.md §5` applies to drag-triggered changes too.
- Must work in RTL.

## D.2 Learned prep time ⭐
Replace the fixed prep estimate with one derived from history: the **median minutes from `new` to `ready`** per item over a recent window (e.g. last 30 days, minimum sample size before trusting it, fall back to the manual `prep_minutes` from `REDESIGN_V2_SPEC.md §5` / migration `0026`).

- Surface it as a **suggestion** in the menu builder ("متوسطك الفعلي ١٨ دقيقة") — never silently overwrite what the restaurant typed.
- Use it for the customer-facing ETA so the promise matches reality.
- Compute in an RPC, not in the browser.

## D.3 Order age emphasis
`ORDERS_DASHBOARD_SPEC.md §3` already defines the warning/danger timer. Add a subtle **column-level summary** — e.g. the oldest order's age per lane in the column header — so a backing-up lane is obvious without reading every card.

---

# E. Keyboard shortcuts (dashboard)

For restaurants working on a laptop.

- `↑` / `↓` (or `j` / `k`) — move selection between order cards
- `Enter` — advance the selected order to its next status
- `/` — focus search
- `?` — show a shortcuts overlay
- `Esc` — clear selection / close sheet

Requirements: shortcuts are **disabled while any input, textarea or contenteditable has focus** so Arabic typing is never intercepted; arrow direction respects RTL; every shortcut has a visible equivalent (nothing is keyboard-only); the overlay is discoverable from the header.

---

# Definition of done

- [ ] Admin shows a growth chart, an MRR curve, and a cohort retention table.
- [ ] The churn-risk panel lists dormant restaurants with risk tiers, tap-to-call, and a recorded outreach action.
- [ ] Admin RPCs are reachable only by `role = 'admin'`, enforced server-side.
- [ ] Every report KPI shows change vs. the previous equivalent period.
- [ ] 2–4 generated Arabic insight sentences appear, always backed by real data.
- [ ] Peak hours and top items render as proper charts.
- [ ] CSV export opens correctly in Excel with Arabic intact.
- [ ] Item profit ranking works where costs are set; cost never appears on a customer surface.
- [ ] The driver screen stays awake during an active delivery and re-acquires the lock after backgrounding.
- [ ] Multiple deliveries sort by proximity, with a manual switch back to oldest-first.
- [ ] «وصلت» updates the customer's tracking page live, via the whitelisted driver route.
- [ ] Orders can be dragged forward between lanes, buttons still work, undo still applies, RTL correct.
- [ ] Prep estimates are learned from history and offered as a suggestion, not forced.
- [ ] Keyboard shortcuts work and never intercept Arabic typing.

---

# Agent prompts (copy & paste, one at a time)

**U0 — Read**
```
Read MASTER_INDEX.md, then AGENTS.md, then UX_IMPROVEMENTS_SPEC.md.
Confirm which base specs this file extends and which rules in MASTER_INDEX section 6 apply.
Do NOT write code yet.
```

**U1 — Churn-risk panel (highest value)**
```
Implement UX_IMPROVEMENTS_SPEC.md section A.3, including migration 0032_admin_cohorts.sql
(show me the SQL and WAIT for my approval before applying).

Build the "مطاعم بخطر الانسحاب" panel: restaurants with no orders for 7+ days, sorted by
days dormant, with risk tiers (7-13 warning, 14+ critical), tap-to-call owner phone, and a
"تمت المتابعة" action that records an outreach note so the same restaurant is not chased
twice. Exclude restaurants in their first week and those already cancelled.

The admin RPCs cross tenant boundaries by design — enforce role='admin' server-side, not
just in middleware.

Print a summary + acceptance result, then STOP.
```

**U2 — Admin charts**
```
Implement UX_IMPROVEMENTS_SPEC.md sections A.1, A.2 and A.4: new-restaurants-per-month chart
with a cumulative toggle, an MRR curve with the current value and month-over-month change,
and a signup-month cohort retention table with colour-scaled cells (reuses the RPCs from
migration 0032_admin_cohorts applied in U1).

Use inline SVG or a library already in the project — do not add a heavy chart dependency.
Print a summary + acceptance result, then STOP.
```

**U3 — Report insights & comparisons**
```
Implement UX_IMPROVEMENTS_SPEC.md sections B.1, B.2 and B.3.

Every KPI tile gets a signed percentage change versus the equivalent previous period,
handling a zero baseline without showing infinity.

Add 2-4 generated Arabic insight sentences above the charts, template-based from real
numbers only — never invented, only shown when the data supports them, each under about
12 words.

Upgrade peak hours to a proper labelled bar chart and give top items proportional bars
showing both count and revenue.

Print a summary + acceptance result, then STOP.
```

**U4 — CSV export & item profitability**
```
Implement UX_IMPROVEMENTS_SPEC.md sections B.4 and B.5, including migration
0031_item_cost.sql (show me the SQL and WAIT for approval).

CSV export of the selected range with UTF-8 BOM so Excel renders Arabic correctly.

Optional cost per menu item, entered in the builder detail panel. Where cost is set, show
margin and rank items by total profit rather than revenue. Items without cost are excluded
with a hint to add costs. Cost and margin must NEVER appear on any customer-facing surface.

Print a summary + acceptance result, then STOP.
```

**U5 — Driver upgrades**
```
Implement UX_IMPROVEMENTS_SPEC.md section C, including migration 0033_driver_arrival.sql
(show me the SQL and WAIT for approval); its row is already in the MASTER_INDEX.md ledger.

C.1 Screen wake lock on the deliveries list and active delivery, released when no delivery
is active and RE-ACQUIRED on visibilitychange. Feature-detect and degrade silently.

C.2 Sort multiple deliveries by haversine distance (from the restaurant, or the driver's
position when permission is granted), show distance per card, with a manual switch back to
oldest-first.

C.3 A "وصلت" action stamping driver_arrived_at and pushing a live update to the customer's
tracking page. It must go through the existing driver server route — add driver_arrived_at
to the column whitelist and nothing else, keeping the ownership check intact.

Print a summary + acceptance result, then STOP.
```

**U6 — Orders board upgrades**
```
Implement UX_IMPROVEMENTS_SPEC.md section D.

D.1 Drag-and-drop between the three lanes to advance status. Keep the existing buttons —
drag is additive. Only forward transitions allowed; backwards is rejected with a toast. The
10-second undo from ORDERS_DASHBOARD_SPEC.md section 5 must still apply. Must work in RTL.

D.2 Learned prep time: an RPC computing the median minutes from new to ready per item over
the last 30 days with a minimum sample size, falling back to the manual prep_minutes value.
Surface it in the menu builder as a SUGGESTION — never silently overwrite what the
restaurant entered — and use it for the customer ETA.

D.3 Show the oldest order's age in each column header.

Print a summary + acceptance result, then STOP.
```

**U7 — Keyboard shortcuts**
```
Implement UX_IMPROVEMENTS_SPEC.md section E: arrow/jk selection, Enter to advance status,
/ to focus search, ? for a shortcuts overlay, Esc to clear.

Critical: shortcuts must be disabled whenever an input, textarea or contenteditable has
focus so Arabic typing is never intercepted. Arrow direction must respect RTL. Every
shortcut needs a visible equivalent — nothing may be keyboard-only.

Print a summary + acceptance result, then STOP.
```

**U8 — Verify**
```
Run the Definition of done checklist in UX_IMPROVEMENTS_SPEC.md and report pass/fail per
item. Then run: npx tsc --noEmit, npx eslint ., npm test, npm run build.

Then verify specifically:
1. A non-admin cannot call any admin RPC, by any route
2. Item cost never appears in any customer-facing response payload
3. A driver can still only act on their own assigned orders after the arrival change
4. Keyboard shortcuts do not fire while typing Arabic in a field
5. Drag-and-drop respects RTL and cannot move an order backwards

Report findings as a list. Do not fix anything yet.
```

**U9 — Update memory & index**
```
Update AGENTS.md "Current status" with the admin visualisations, report insights, driver
upgrades, orders board upgrades and keyboard shortcuts.

Update MASTER_INDEX.md: mark migrations 0031, 0032 and 0033 as applied in the ledger, and
confirm the screen ownership map still reflects reality.
```
