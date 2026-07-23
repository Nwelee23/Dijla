# AGENTS.md — Project Memory

> Place this file at the **root of the repo**. Agent IDEs read it as standing instructions every session,
> so the agent always knows what this project is, the stack, and the conventions. Keep it updated as the app grows.
>
> **Antigravity note:** Antigravity natively reads `AGENTS.md` (v1.20.3+) and `GEMINI.md`. If your Antigravity
> version is older, also save a copy of this file as `GEMINI.md` in the repo root. (`GEMINI.md` takes precedence if both exist.)

## Project

**Name:** Dijla (دجلة) — *the Tigris river; deeply Iraqi, evokes flow and continuity.*

**What it is:** A commission-free ordering & operations platform (SaaS) for Iraqi restaurants, built for Najaf first.
One system, three surfaces:
1. **Customer** — QR dine-in menu (`/t/[qr_token]`) + direct delivery link (`/r/[slug]`). No app install.
2. **Restaurant dashboard** (`/dashboard`) — live orders, menu, tables/QR, drivers, reports.
3. **Driver app** (`/driver`) — assigned deliveries, navigate to GPS pin, status updates.

**Business model:** flat monthly subscription per restaurant. **Never per-order commission** — that's the whole pitch vs. Talabat/Baly.

**Key product rules:**
- Delivery addresses in Iraq are informal → capture a **GPS pin** from the customer's browser + a "nearest landmark" text field. Do NOT rely on street addresses.
- **COD (cash on delivery)** is the only payment for now. No payment gateway yet.
- Ship order: dine-in first, then delivery, then driver dispatch.

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling/UI:** Tailwind CSS + shadcn/ui. **RTL + Arabic-first**, mobile-first.
- **Backend/DB/Auth/Realtime/Storage:** Supabase (PostgreSQL). Use Supabase Realtime for live orders and Supabase Storage for images.
- **Auth:** Supabase Auth — **email OTP (primary)**, delivered via **Brevo SMTP** configured in the Supabase dashboard. Email/password is the fallback. Phone OTP is coded but dormant: it needs a paid SMS provider, so switch it on only when the pilot justifies the cost.
- **Maps:** browser Geolocation API + Leaflet/OpenStreetMap; navigation via Google Maps deep-link. Avoid paid Maps APIs early.
- **QR:** `qrcode` npm package.
- **Hosting:** Vercel (frontend) + Supabase (backend). PWA installable (manifest + service worker), like the previous `dealshop-iq` app.

## Conventions

- **No emoji in the product. Ever.** Every glyph in the UI is a `lucide-react` icon — no emoji in labels, buttons, empty states, toasts, or seed data. Emoji render differently on every device, break alignment in RTL, and read as unprofessional to a restaurant owner. This applies to shipped UI; commit messages and chat are unaffected.
- **Multi-tenant:** almost every table has `restaurant_id`. Enforce isolation with Supabase **Row-Level Security (RLS)** — a user only accesses rows for their own restaurant. Drivers only see orders assigned to them.
- **Never hardcode secrets.** Use `.env.local`; keep the Supabase **service_role** key server-side only.
- **Types:** generate DB types from Supabase; keep shared types in `lib/supabase/`.
- **Money:** store as numeric; currency default `IQD`.
- **Snapshots:** `order_items` store `name_snapshot` and `price_snapshot` so past orders don't change when the menu changes.
- **Roles:** `owner` | `staff` | `driver` | `admin` (in `profiles.role`).
- Keep components small; put data hooks in `lib/hooks/` (e.g. `useRealtimeOrders`, `useCart`, `useGeolocation`).

## Current status

- **Phases 0–5 complete + deployed**, plus Phase 7's growth-metrics layer. Built: foundations, menu engine, dine-in QR ordering, delivery + driver dispatch, driver app, reports, subscriptions, a super-admin panel, and the founder growth dashboard (`/admin/growth`).
- **AUTH_UI_SPEC.md fully built (5/5)** — replaces the old tasks 1.1–1.2. River-night glass design system; username+password login; emailed-code sign-in; forgot/reset (invalidates other sessions); 3-step signup wizard (restaurant fields + Leaflet GPS pin + **private** `verification-docs` bucket + live username availability); and pending→verified gating (a pending restaurant builds its menu but `/api/orders` refuses `not_verified`; a guard trigger blocks owner self-verify).
- **Auth model deviation from the spec:** there is no SMS provider, so **email is the verify/recovery anchor** (not phone OTP), chosen by the owner. Phone-OTP code stays wired behind a switch. Daily login is username+password (username→account email resolved server-side). Working hours are left 24h-open for now; logo is added later in settings.
- **ORDERS_DASHBOARD_SPEC.md fully built (8/8)** — supersedes task 2.6. Live 3-column kanban (new/preparing/ready); live per-card elapsed timer with per-restaurant warn/danger thresholds (in `settings` jsonb, Settings-configurable); 10-second undo on every status change (compensating history row); cancel-with-reason + confirm step (`orders.cancellation_reason`); day archive at `/dashboard/orders/archive` (never delete — completed/cancelled leave the board); kitchen screen as its own route `/dashboard/orders/kitchen` (big type, no prices, one action, Screen Wake Lock); new-order alert hardened (20s repeat while unacknowledged + tab-title count badge); reconnect-resync confirmation toast. **The whole restaurant dashboard is now river-night dark** (`.dark.dj-dashboard` scope in globals.css, teal-tinted, with a `@media print` light reset for QR/cash sheets; contrast verified ≥4.5:1). Delivery detail (§7) was already on the card (tap-to-call, landmark, map, Navigate, no PII in URLs).
- **MENU_BUILDER_SPEC.md built** — supersedes tasks 1.5/1.6/2.2/2.3. Starter-menu templates per restaurant_type (import from the empty state, `src/lib/menu-templates.ts`); duplicate item with its option groups/options (no shared image file); menu preview (opens `/r/[slug]`), completeness nudge and live count in the header; `menu_items.name_secondary`/`description_secondary` (migration 0024) with an optional second-language name field; full option-groups editor in the item dialog (add group, required/multi = max_select 1/99, options with +price deltas, immediate-persist); tables/QR gained the public delivery-link copy and a white QR backing so codes stay scannable on the dark theme (print A4 / per-table PNG / nanoid tokens already existed). §5 friction rules hold: name+price is enough to save, category auto-defaults, photos never required. (Photo-to-menu extraction §2.3 deferred by the spec; a minor "N sizes · N extras" row-meta count is still unbuilt.)
- **Migrations applied through `0024`.** Migrations are pasted into the Supabase SQL editor by the owner (the agent has no DDL access); each is idempotent/re-runnable. Test scripts live in the gitignored `coverage/` dir (node `.mjs`, run against real Supabase, self-cleaning).
- **Payments:** COD (cash) only — electronic payment (Phase 6) deliberately deferred by the owner.
- **The real remaining step is a pilot**, not more building: put Dijla in a real Najaf restaurant. Personal setup still pending: set `NEXT_PUBLIC_SUPPORT_PHONE` in Vercel; real-device test of driver GPS/PWA/order sound; optional custom domain.
- Full plan: see `DIJLA_PROJECT_PLAN.md`.

## Docs

- Antigravity IDE: https://antigravity.google
- (Portable `AGENTS.md` spec works across Antigravity, Cursor, and Claude Code.)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
