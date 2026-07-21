# Dijla — Phase 3 Build Brief: Direct Delivery Ordering

> Context: `AGENTS.md` (project memory) + `DIJLA_PROJECT_PLAN.md` (full plan, §9 Phase 3).
> **This is the commission-killer phase** — restaurants take delivery orders directly, with no third-party commission. It's the upsell to the **pro** tier.

## Prerequisites (must be true before starting)

- [ ] **Phase 2 is done and running in real restaurants.**
- [ ] Do **not** start this phase until at least one real restaurant is using Phase 2.

> Owner override, 2026-07-21: started before this was met. Database at the time:
> 1 restaurant, 0 tables, 0 orders.

## Ground rules

- Reuse Phase 2: menu rendering, `useCart`, and the server order route. This phase adds `/r/[slug]` and a checkout with location capture.
- **Never trust the client.** Recompute item prices, delivery fee and totals server-side.
- **Privacy:** never put customer coordinates or phone in a URL or query string.
- Multi-tenant + RLS everywhere. COD only. Pause for approval before any migration.

## Tasks

### 3.1 — Public restaurant menu page `/r/[slug]`
Resolve slug -> restaurant, render the same menu + cart used by `/t/[qr_token]`, no table.
**Acceptance:** `/r/[slug]` shows the menu and lets the customer build a cart.

### 3.2 — Location capture
GPS pin via Geolocation API, shown on Leaflet + OpenStreetMap, draggable. Manual placement when permission is denied. Required: name, phone, and an accurate pin or a clear landmark.
**Acceptance:** pin can be set automatically or manually; blocked geolocation still works.

### 3.3 — Delivery / pickup checkout + place order
Type toggle. Delivery adds the restaurant's `delivery_fee`; pickup has neither fee nor location. Server route recomputes everything and stores customer name, phone, lat, lng, landmark, notes.
**Acceptance:** a delivery order is created with server-computed totals including the fee; pickup carries no fee or location.

### 3.4 — Delivery orders on the dashboard
Delivery cards show phone (tap to call), landmark, a map preview and a Navigate deep link. Statuses extend through `out_for_delivery` -> `delivered`.
**Acceptance:** delivery orders appear live with pin, Navigate and tap-to-call.

### 3.5 — Customer order tracking
Status advances through `delivered` without a refresh.

### 3.6 — Restaurant delivery settings
Migration adds `delivery_enabled`, `pickup_enabled`, `min_order` to `restaurants`; settings page exposes them; `/r/[slug]` honours them.

### 3.7 — Pro-tier gating
Delivery is the **pro** feature. Basic tier sees an upgrade prompt.

### 3.8 — Polish, privacy and edge cases
Geolocation denied, map fails, delivery disabled, below `min_order`, out of hours, COD shown. No PII in URLs.

## Definition of done

- [ ] Customer opens `/r/[slug]`, builds a cart, checks out for delivery.
- [ ] Pin (auto or manual) + landmark + phone; pickup works with no location.
- [ ] Order lands live with pin, Navigate, tap-to-call, server-computed total incl. fee.
- [ ] Staff move it through `out_for_delivery` -> `delivered`; customer sees it live.
- [ ] Delivery/pickup toggles + fee + min order respected.
- [ ] Delivery gated to pro/trial; no client price trusted; no PII in URLs.
