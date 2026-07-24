# Dijla — Redesign & Features Spec (v2)

Complete specification for the visual redesign and the new features agreed with the owner.
This file **supersedes** the theme sections of `AUTH_UI_SPEC.md` (§1), all of `MENU_BUILDER_SPEC.md` **§1–§6** (the builder — **§7 Tables & QR stays active**, per `MASTER_INDEX.md §3`), the customer-menu parts of `PHASE_2_BUILD.md` (2.4) and `PHASE_3_BUILD.md` (3.1), and the alert section of `ORDERS_DASHBOARD_SPEC.md` (§4).

> Context: `AGENTS.md`. Arabic-first, RTL, mobile-first. Read `MASTER_INDEX.md` first.
> **Note:** §4 (customer item sheet with options) also closes the revenue bug from `AUDIT_FIX_PROMPTS.md` FIX 1 — build them together. **In this repo FIX 1 is already applied** (migration `0025_menu_payload_options`, server-side re-pricing, `options_snapshot`); §4 rebuilds the *presentation* on top of that working data path — do not undo the server-side pricing.
>
> **Repo migration numbering (important):** `0025` is taken by `0025_menu_payload_options` (FIX 1), so **every migration in this spec is offset `+1` from the numbers in the original draft.** The numbers below are the repo-correct ones and match `MASTER_INDEX.md §5`. Draft `0025→0026`, `0026→0027`, `0027→0028`, `0028→0029`, `0029→0030`.
>
> **No-emoji rule still binds.** Emoji shown in chips and badges below (🔥 🌱 ⚡ ⭐ 🌶️ ✨) are illustrative sketches only. Ship every one as a **`lucide-react` icon** — no emoji in the product (`AGENTS.md`).

**Contents:** 1 Colour system · 2 Dark/light mode · 3 Logo & icons · 4 Customer menu v2 · 5 Search & filtering · 6 Sold-out handling · 7 Menu builder v2 · 8 Menu layout templates · 9 Restaurant QR & poster · 10 Trilingual · 11 Push notifications

---

## 1. Colour system

**Single accent + warm-neutral base.** The whole brand changes by editing one token. Base is Tailwind's **stone** scale (warm neutral), which is already available in the project's Tailwind v4 setup.

### 1.1 Tokens

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAF9` | `#0C0A09` |
| `--surface` | `#FFFFFF` | `#1C1917` |
| `--border` | `#E7E5E4` | `#292524` |
| `--fg` | `#1C1917` | `#FAFAF9` |
| `--muted` | `#78716C` | `#A8A29E` |
| `--accent` | `#0A8F64` | `#14B885` |
| `--accent-fg` | `#FFFFFF` | `#04231A` |
| `--accent-wash` | `rgba(10,143,100,.12)` | `rgba(20,184,133,.16)` |
| `--success` | `#065F46` | `#6EE7B7` |
| `--warning` | `#B45309` | `#FBBF24` |
| `--danger` | `#B91C1C` | `#FCA5A5` |

**Accent is a deep jewel emerald, not mint.** The warmth comes from the food photography, not the UI.

Replace every hard-coded colour in the codebase with these tokens. No component should ship a literal hex.

### 1.2 Elevation rule (important)
- **Light mode separates with shadows:** `0 1px 2px rgba(28,25,23,.05), 0 1px 10px rgba(28,25,23,.03)`.
- **Dark mode separates with borders** — shadows are invisible on dark. Set shadow to `none` in dark and rely on `--border`.

Do not simply invert the light theme; design both.

---

## 2. Dark / light mode

- Use **`next-themes`** (already a dependency). Support `light`, `dark`, and `system`.
- Persist the user's choice; respect the OS setting by default.
- **Defaults by surface:**
  - Customer pages (`/r/[slug]`, `/t/[qr_token]`) — **light** (food photography reads better on light).
  - Restaurant dashboard, kitchen view, driver app, admin — **dark** (long shifts, less eye strain).
  - Every surface still offers a manual toggle.
- Add a theme toggle to the dashboard header and the customer menu header.
- Set `<meta name="theme-color">` per mode, and ensure no flash of wrong theme on load.
- All text must pass **4.5:1** contrast in both modes.

---

## 3. Logo & icons

**Mark: a flowing river line above a bowl** — the Tigris meets the plate. Chosen for clarity at icon sizes.

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="دجلة">
  <rect width="100" height="100" rx="24" fill="var(--accent)"/>
  <path d="M26 44c9-7 14 4 24 0s15-8 24-1" stroke="var(--accent-fg)" stroke-width="5.5"
        stroke-linecap="round" fill="none" opacity=".55"/>
  <path d="M24 56c0 12 11 20 26 20s26-8 26-20z" fill="var(--accent-fg)"/>
</svg>
```

- Ship as an SVG component with the mark on transparent background too (for use on coloured surfaces).
- **Wordmark:** mark + «دجلة» with `DIJLA` beneath in small letter-spaced Latin.
- Regenerate all **PWA icons** (192, 512, maskable, apple-touch) from this mark using the existing `scripts/generate-icons.mjs`. Include a maskable variant with safe padding.
- Update `manifest.json` `theme_color` / `background_color` to the new palette.
- Add an `/opengraph-image` using the mark, so links preview well when shared on WhatsApp.

---

## 4. Customer menu v2 (`/r/[slug]` and `/t/[qr_token]`)

The approved design. Light theme by default.

### 4.1 Header
- A **coloured gradient cover** (accent → deeper accent), ~96px.
- Overlaid pills: **language switcher** (ع | En | فا, §10) and context (`طاولة ٥` for dine-in).
- A **restaurant card floating over the cover** (negative top margin, elevated): logo, name, and a status line — open/closed dot, average prep time, cuisine type.

### 4.2 Search & filter bar
Directly beneath the header: a search field, then a horizontal row of filter chips (`فلترة`, `🔥 الأكثر طلباً`, `🌱 نباتي`, `⚡ سريع`). See §5. *(Emoji illustrative — ship lucide icons.)*

### 4.3 "الأكثر طلباً اليوم" carousel
A horizontally scrolling row of large cards (~150px wide) with a big photo, a badge showing **real order counts** (`🔥 ٥٨ طلب`) or `⭐ اختيار الشيف`, name, price, and a quick-add button. Computed from actual order data over a recent window; hidden when there isn't enough data.

### 4.4 Sticky category bar
A horizontally scrolling category bar that **sticks to the top on scroll** and highlights the active category via scroll-spy. Tapping scrolls to that section.

### 4.5 Item rows
Card rows: 64px rounded thumbnail, name with inline tag badges, a two-line description, price in accent, and a quick-add `+` button. Quick-add adds directly **only when the item has no required options**; otherwise it opens the detail sheet.

### 4.6 Item detail — bottom sheet (not a page)
Opens as a bottom sheet:
- Large photo header (~180px), close button, and overlaid badges (`🔥 الأكثر طلباً`, `⏱ ١٥ دقيقة`).
- Name + price, full description.
- **Option groups** — single-select when `max_select = 1`, multi-select when `> 1`, `is_required` enforced before adding. Each option shows its `price_delta` (`+٨٬٠٠٠`).
- Kitchen note field.
- **Sticky footer**: quantity stepper + a full-width add button showing the **live computed price including options**.

> **Server rule (revenue-critical):** the client sends option IDs only. The server re-reads every option from the database, validates it belongs to a group belonging to that item belonging to that restaurant, enforces `is_required`/`max_select`, computes `(item price + Σ price_delta) × quantity`, and writes the resolved names and deltas into `options_snapshot`. **Never trust a client-sent price or `price_delta`.** *(This path already exists in `src/lib/orders.ts` `priceLines()` + `/api/orders` after FIX 1 / migration `0025`; §4 is the front-end for it.)*

### 4.7 Floating cart
A persistent floating pill at the bottom: item count badge + running total + a forward arrow. Never scrolls away.

---

## 5. Search & filtering

A filter panel (sheet) with:

- **Search** — instant, matches name and description, in the **active language** (§10).
- **الفئة** — category chips.
- **الوسوم** — `🔥 الأكثر طلباً`, `⭐ اختيار الشيف`, `🌱 نباتي`, `🌶️ حار`, `✨ جديد`. *(Emoji illustrative — ship lucide icons.)*
- **السعر** — ranges (`أقل من ١٠٬٠٠٠`, `١٠–٢٠ ألف`, `فوق ٢٠٬٠٠٠`), derived from the restaurant's actual price distribution.
- **وقت التحضير** — e.g. `⚡ أقل من ١٥ دقيقة`.
- **إخفاء الأصناف الناضبة** — toggle, default **off** (see §6).
- **مسح الكل** action.

**Required behaviours:**
- The apply button shows the **result count before applying** (`عرض ٧ أصناف`) so nobody filters into an empty screen.
- Filter state lives in the URL query so a filtered menu can be shared and survives refresh. **No PII in the URL** — filters only.
- Active filters appear as removable chips above the list.
- A friendly empty state with a "clear filters" action.

<details><summary>0026_menu_tags_prep_time.sql</summary>

```sql
-- tags: free-form but validated in app code against a known set
alter table menu_items add column if not exists tags text[] not null default '{}';
alter table menu_items add column if not exists prep_minutes int;

create index if not exists idx_menu_items_tags on menu_items using gin (tags);
```
</details>

---

## 6. Sold-out handling

The `is_available` flag already exists. Changes:

- **Restaurant side:** one-tap toggle **directly on the menu card** — the single most-used daily action. Optimistic update, instant effect on the customer menu, plus a bulk "mark several sold out" action.
- **Customer side:** the item stays **visible but dimmed** with a `نفد اليوم — يرجع غداً` badge, and cannot be added. Hiding it entirely makes the menu look thin; showing it signals a wider range and encourages a return visit.
- **Auto-restore:** sold-out items automatically become available again at the start of the next service day (restaurant-local time), because staff will forget to switch them back. Add a per-item override (`نفد بشكل دائم`) that opts out of auto-restore.
- Filter toggle to hide them (§5), default off.

<details><summary>0027_sold_out_autorestore.sql</summary>

```sql
alter table menu_items add column if not exists sold_out_at timestamptz;
alter table menu_items add column if not exists auto_restore boolean not null default true;
```
Set `sold_out_at` when toggled off. A scheduled job (or a check on first read of the day) restores items where `auto_restore` is true and `sold_out_at` is before the current service day.
</details>

---

## 7. Menu builder v2 (`/dashboard/menu`)

Replaces the current list-row editor. Photo-first cards + a rich detail panel. Dark by default, light toggle.

### 7.1 Card grid
Each item is a **card**: photo (or a category-icon placeholder), name, short description, meta badges (`٢ أحجام`, `٢ إضافات`), price, and a **one-tap availability toggle**. Auto badges overlay the photo: `الأكثر طلباً`, `جديد`, `نفد اليوم`. Drag to reorder. The card mirrors what the customer sees.

### 7.2 Bulk photo drop
A dashed drop zone accepting **many images at once**. Match each file to an item by filename similarity, show a review step where the owner confirms or reassigns matches, then attach. This is the slowest step in onboarding — make it the fastest.

### 7.3 Detail panel
Slide-out panel with: photo (with replace action), name, **secondary names** (English/Persian), description, price, **prep time**, **tags** (§5), and option groups with their price deltas. Actions: save, duplicate.

### 7.4 Quick add
Keep a **paste-lines** mode: the owner types one item per line (`كباب عراقي ١٢٬٠٠٠`), the app parses name + price, shows a review list, and bulk-creates. Also keep template import per `restaurant_type`.

### 7.5 Friction rules (unchanged, still binding)
Name + price are the only required fields. Never require a photo, description, category, or options to save. An item with no category goes to an auto-created `أصناف أخرى`. Autosave drafts.

### 7.6 Live preview
A **معاينة الزبون** action opening the real customer view. On wide screens, offer it as a side-by-side live preview.

---

## 8. Menu layout templates

The restaurant picks how its menu renders, in settings:

1. **شبكة بصور** — two-column photo grid. Highest conversion; for restaurants with good photography.
2. **قائمة مدمجة** — compact rows with small thumbnails. For large menus (50+ items) or few photos.
3. **أصناف مميزة** — one hero item with a large image, then compact rows. Raises average order value.

**Smart default:** pick automatically based on photo coverage — if most items have photos use the grid, otherwise the compact list. The restaurant can override at any time. This ensures even a lazy restaurant gets a good-looking menu.

<details><summary>0028_menu_layout.sql</summary>

```sql
alter table restaurants add column if not exists menu_layout text not null default 'auto'
  check (menu_layout in ('auto','grid','list','featured'));
```
</details>

---

## 9. Restaurant QR & storefront poster

Table QR already exists (`MENU_BUILDER_SPEC.md §7`, still active). Add the **restaurant-level QR** for the delivery link:

- On `/dashboard/tables` (or a new **الرموز** page), render a QR for `→/r/[slug]` beside the existing copyable link, with a PNG download.
- A **printable storefront poster** (A4): the restaurant logo, a large QR, `اطلب أونلاين` in Arabic, and the short link as text. The restaurant sticks it on the door/window so passers-by can order delivery.
- A **small sticker sheet** version for delivery bags and receipts, so a customer can reorder directly.
- QR must be **dark modules on white**, generous quiet zone, and large enough to scan after printing. Never render a QR on a dark or coloured background.

---

## 10. Trilingual support (Najaf pilgrim advantage)

`name_secondary` / `description_secondary` already exist (migration 0024). Extend to three languages and expose the switcher.

- Menu content languages: **العربية · English · فارسی**. One price, multiple names.
- Menu builder: secondary-name fields per item, with a clear indicator of translation coverage.
- Customer menu: the header language pill switches content language; falls back to Arabic when a translation is missing (never show an empty name).
- Persist the choice per visitor; the UI chrome (buttons, labels) uses the existing i18n dictionaries.
- Search (§5) matches the **active** language.

<details><summary>0029_menu_third_language.sql</summary>

```sql
alter table menu_items add column if not exists name_fa text;
alter table menu_items add column if not exists description_fa text;
-- existing name_secondary/description_secondary hold English
```
</details>

---

## 11. Push notifications (critical reliability gap)

**Current state:** the dashboard plays a synthesised Web Audio alert, re-chimes every 20s while orders are unacknowledged, and badges the tab title — but **only while the page is open**. There is no Web Push: no `pushManager`, no VAPID keys, no `push` handler in `public/sw.js`. If the restaurant closes the tab or locks the phone, **the order is silently missed.**

Implement real push:

1. **VAPID keys** — generate a pair, private key server-only in env, public key exposed to the client.
2. **Subscribe** — after login, the dashboard (and driver app) requests notification permission and registers a `PushSubscription`. Store subscriptions per user/restaurant in a new table. Handle permission denial gracefully with a persistent "notifications are off" warning in the dashboard header.
3. **Service worker** — add `push` and `notificationclick` handlers to `public/sw.js`: show the notification (order number, type, table/customer, total) and, on click, focus or open the orders dashboard at that order. **Keep the existing cache rules intact** — the SW deliberately never caches HTML because restaurant devices are shared; do not weaken that.
4. **Send** — the order-creation route (and driver assignment) sends the push server-side after the order is committed. Sending must never block or fail the order; failures are logged and swallowed.
5. **Housekeeping** — delete subscriptions that return 404/410, and allow the user to disable notifications.

**iOS caveat (must handle):** Web Push on iOS works **only when the PWA is installed to the home screen** (iOS 16.4+). Detect iOS Safari without standalone mode and show explicit install instructions during onboarding — treat installing the app as a **required onboarding step**, not optional.

**Fallback safety net:** if an order sits in `new` for more than ~3 minutes without being accepted, notify the owner by **WhatsApp or SMS**. This is the last line of defence and depends on no browser at all. (Requires the messaging integration from `PHASE_6_BUILD.md` module B — if that is not built yet, leave a clean hook and log the event.)

<details><summary>0030_push_subscriptions.sql</summary>

```sql
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

create policy own_push_subscriptions on push_subscriptions
  for all using (user_id = auth.uid());
```
</details>

---

## Definition of done

- [ ] Every colour comes from a token; no literal hex in components.
- [ ] Light and dark both look designed (shadows in light, borders in dark); all text ≥ 4.5:1.
- [ ] Customer surfaces default light, staff surfaces default dark, both togglable, no flash on load.
- [ ] New logo ships as an SVG component and all PWA/apple/maskable icons are regenerated.
- [ ] Customer menu v2: floating restaurant card, search, filter chips, top-selling carousel, sticky scroll-spy categories, card rows, bottom-sheet detail, floating cart.
- [ ] **Options are selectable and priced server-side, with `options_snapshot` populated** (closes the FIX 1 revenue bug).
- [ ] Filtering works with a pre-apply result count, URL-persisted state, removable chips, and an empty state.
- [ ] Sold-out: one-tap from the card, dimmed-but-visible for customers, auto-restores next service day.
- [ ] Menu builder v2: photo-first cards, bulk photo drop with review, detail panel with tags/prep time/options, quick-add lines, template import, live preview.
- [ ] Three menu layout templates with an automatic smart default.
- [ ] Restaurant QR plus printable storefront poster and sticker sheet, all reliably scannable.
- [ ] Arabic/English/Persian menu content with a working switcher and Arabic fallback.
- [ ] **Web Push delivers a new-order notification with the dashboard closed**, on Android and on an installed iOS PWA; permission-denied is surfaced; the SW's no-HTML-cache rule is unchanged.
- [ ] No emoji ship in any of the above — every chip/badge glyph is a `lucide-react` icon.

---

# Agent prompts (copy & paste, one at a time)

**R0 — Read**
```
Read REDESIGN_V2_SPEC.md together with AGENTS.md. Summarize the colour system, the
dark/light rules, and the eleven areas you will change. List which existing spec files
this supersedes. Do NOT write code yet.
```

**R1 — Colour system + dark/light**
```
Implement REDESIGN_V2_SPEC.md sections 1 and 2.

- Define the full token set for light and dark in the Tailwind v4 theme and globals.css.
- Replace every hard-coded colour across the codebase with tokens — no literal hex may
  remain in components.
- Wire next-themes with light/dark/system, persisted, respecting the OS setting.
- Customer pages default to light; dashboard, kitchen, driver and admin default to dark;
  all offer a manual toggle.
- Apply the elevation rule: shadows in light, borders in dark. Do not invert one theme
  to make the other.
- Set per-mode theme-color meta and prevent any flash of the wrong theme on load.
- Verify 4.5:1 contrast for all text in both modes.

Print a summary + acceptance result, then STOP.
```

**R2 — Logo & icons**
```
Implement REDESIGN_V2_SPEC.md section 3: ship the river-and-bowl mark as an SVG component
(filled and transparent variants), build the wordmark lockup, regenerate all PWA icons via
scripts/generate-icons.mjs including a maskable variant with safe padding, update
manifest.json colours, and add an opengraph image.

Print a summary + acceptance result, then STOP.
```

**R3 — Customer menu v2 + options (revenue fix)**
```
Rebuild the customer menu per REDESIGN_V2_SPEC.md section 4, for both /r/[slug] and
/t/[qr_token].

Include: gradient cover header with the floating restaurant card, language pill, search and
filter chip row, "الأكثر طلباً اليوم" carousel driven by real order counts, sticky scroll-spy
category bar, card rows with quick-add, bottom-sheet item detail, and a persistent floating
cart pill.

CRITICAL — the options revenue path already exists (FIX 1 / migration 0025): the item sheet
must render option groups (single-select when max_select = 1, multi-select when greater,
is_required enforced) and show live price including options; the client sends option IDs
only; the server re-reads every option, validates ownership through group -> item ->
restaurant, enforces is_required and max_select, computes (item price + sum of price_deltas)
x quantity, and writes resolved names and deltas into options_snapshot. Never trust a
client-sent price or price_delta. Show selected options on the orders dashboard, kitchen
view and driver app.

Ship all chips/badges as lucide icons, not emoji.
Print a summary + acceptance result, then STOP.
```

**R4 — Search & filtering**
```
Implement REDESIGN_V2_SPEC.md section 5, including migration 0026_menu_tags_prep_time.sql
(show me the SQL and wait for approval before applying).

Filters: category, tags, price ranges derived from the restaurant's actual prices, prep
time, and a hide-sold-out toggle defaulting to off. Search matches name and description in
the active language.

Required: the apply button shows the result count before applying; filter state lives in
the URL query with no PII; active filters render as removable chips; include a friendly
empty state with a clear-filters action.

Print a summary + acceptance result, then STOP.
```

**R5 — Sold-out handling**
```
Implement REDESIGN_V2_SPEC.md section 6, including migration 0027_sold_out_autorestore.sql
(show me the SQL and wait for approval).

One-tap toggle on the menu card with optimistic update and a bulk action; customers see the
item dimmed and unaddable with "نفد اليوم — يرجع غداً" rather than hidden; items auto-restore
at the start of the next service day in the restaurant's local time, with a permanent
sold-out override that opts out.

Print a summary + acceptance result, then STOP.
```

**R6 — Menu builder v2**
```
Rebuild /dashboard/menu per REDESIGN_V2_SPEC.md section 7: photo-first card grid with
drag reorder and a one-tap availability toggle, auto badges, bulk photo drop with a
filename-matching review step, a slide-out detail panel (photo, names in three languages,
description, price, prep time, tags, option groups), quick-add paste-lines mode, template
import, and a live customer preview.

Every friction rule in section 7.5 is binding: only name and price are required to save.
Print a summary + acceptance result, then STOP.
```

**R7 — Layout templates**
```
Implement REDESIGN_V2_SPEC.md section 8 including migration 0028_menu_layout.sql (show me
the SQL and wait for approval): three customer menu layouts (grid, compact list, featured)
selectable in settings, with an "auto" default that picks based on photo coverage.

Print a summary + acceptance result, then STOP.
```

**R8 — Restaurant QR & poster**
```
Implement REDESIGN_V2_SPEC.md section 9: a QR for the restaurant's /r/[slug] link with PNG
download, a printable A4 storefront poster (logo, large QR, "اطلب أونلاين", short link),
and a sticker sheet for delivery bags.

QR must be dark-on-white with a generous quiet zone and must never render on a dark or
coloured background. Print one and confirm it scans.
Print a summary + acceptance result, then STOP.
```

**R9 — Trilingual**
```
Implement REDESIGN_V2_SPEC.md section 10 including migration 0029_menu_third_language.sql
(show me the SQL and wait for approval): Arabic, English and Persian menu content, secondary
name fields in the builder with translation-coverage indicators, a header language switcher
that persists per visitor, Arabic fallback when a translation is missing, and search that
matches the active language.

Print a summary + acceptance result, then STOP.
```

**R10 — Push notifications**
```
Implement REDESIGN_V2_SPEC.md section 11 including migration 0030_push_subscriptions.sql
(show me the SQL and wait for approval).

Today the new-order alert only works while the page is open — there is no Web Push at all.
Build it:
- VAPID keys (private server-only in env, public exposed to the client)
- Subscription registration after login for the dashboard and driver app, storing
  subscriptions per user and restaurant, with graceful handling and a persistent warning
  when permission is denied
- push and notificationclick handlers in public/sw.js showing order number, type,
  table or customer, and total, and focusing the orders dashboard on click
- Server-side sending from the order-creation route and on driver assignment, which must
  never block or fail the order
- Cleanup of subscriptions returning 404 or 410, and a user-facing disable option

IMPORTANT: do not weaken the service worker's existing rule that HTML is never cached —
restaurant devices are shared and that rule prevents leaking one tenant's orders to another.

iOS: Web Push requires the PWA to be installed to the home screen (iOS 16.4+). Detect iOS
Safari not in standalone mode and show explicit install instructions, and make installing
the app a required onboarding step rather than an optional one.

Also add a hook for the fallback: if an order stays in "new" for more than 3 minutes without
being accepted, trigger an owner notification via WhatsApp/SMS. If that messaging
integration does not exist yet, leave a clean interface and log the event.

Then prove it: with the dashboard CLOSED, place an order and confirm a push notification
arrives.
Print a summary + acceptance result, then STOP.
```

**R11 — Verify**
```
Run the Definition of done checklist in REDESIGN_V2_SPEC.md and report pass/fail per item.

Then run: npx tsc --noEmit, npx eslint ., npm test, npm run build.

Then verify specifically:
1. No literal hex colours remain in components
2. A client-supplied price or price_delta cannot influence an order total
3. A push notification arrives with the dashboard closed
4. A printed QR scans and opens the correct menu
5. All text passes 4.5:1 contrast in both light and dark

Report findings as a list. Do not fix anything yet.
```

**R12 — Update memory**
```
Update AGENTS.md: record the new colour system and theme rules, the logo, the menu builder
v2 and customer menu v2, filtering, sold-out auto-restore, trilingual support, and push
notifications. Add REDESIGN_V2_SPEC.md to the Docs list and note which specs it supersedes.
Update MASTER_INDEX.md: mark the applied migrations and flip the affected screen-ownership
rows to built.
```
