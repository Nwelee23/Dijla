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

- Building **Phase 0 (foundations)** and **Phase 1 (menu engine + restaurant onboarding)**.
- Full plan: see `DIJLA_PROJECT_PLAN.md`. Detailed build steps for the current phases: see `PHASE_0_1_BUILD.md`.
- Do NOT build delivery (Phase 3) or the driver app (Phase 4) before dine-in (Phase 2) works in real restaurants.

## Docs

- Antigravity IDE: https://antigravity.google
- (Portable `AGENTS.md` spec works across Antigravity, Cursor, and Claude Code.)

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
