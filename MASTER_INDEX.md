# Dijla — Master Index (single source of truth)

**Read this file first, before any other spec.** It says which file governs which screen, resolves every conflict between files, and defines how new files are added.

> If any two documents disagree, **this file decides**. If this file is silent, apply the precedence rule in §2.

---

## 1. File registry

| File | Role | Status |
|---|---|---|
| `AGENTS.md` | Project memory, stack, conventions | **Always active** |
| `MASTER_INDEX.md` | This file — routing & conflict resolution | **Always active** |
| `DIJLA_PROJECT_PLAN.md` | Business plan, stack rationale, DB overview | Reference |
| `PHASE_0_1_BUILD.md` … `PHASE_6_BUILD.md` | Sequenced build steps per phase | Active **except** sections listed in §3 |
| `PHASE_7_PLAYBOOK.md` | Post-launch growth decisions | Reference |
| `AGENT_PROMPTS.md` | Prompts for phases 0–6 | Active |
| `AUTH_UI_SPEC.md` | Login, signup, onboarding, verification | Active **except §1** (theme) |
| `MENU_BUILDER_SPEC.md` | Menu builder + **Tables & QR** | **Only §7 active** (see §3) |
| `ORDERS_DASHBOARD_SPEC.md` | Live orders, kitchen view | Active **except §1, §4** |
| `DRIVER_REPORTS_ADMIN_SPEC.md` | Driver app, reports, admin panel | Active **except theme lines** |
| `REMAINING_SCREENS_SPEC.md` | Delivery checkout, landing page, settings, drivers, archive, subscription, checklist | Active **except theme rule** |
| `AUDIT_FIX_PROMPTS.md` | Repo audit fixes | Active **except FIX 1** (see §3) |
| `REDESIGN_V2_SPEC.md` | Colours, dark/light, logo, customer menu v2, filtering, sold-out, menu builder v2, layouts, restaurant QR, trilingual, push | **Active — highest authority on visuals** (in repo; not yet implemented) |
| `UX_IMPROVEMENTS_SPEC.md` | Admin charts, report insights, driver upgrades, orders board upgrades, shortcuts | Active (in repo; not yet implemented) |

---

## 2. Precedence rule

When two active documents cover the same thing:

1. **`MASTER_INDEX.md`** (this file) overrides everything.
2. **`REDESIGN_V2_SPEC.md`** overrides all others **on anything visual** — colour, theme, typography, layout, iconography.
3. **Screen specs** (`AUTH_UI_SPEC`, `ORDERS_DASHBOARD_SPEC`, `DRIVER_REPORTS_ADMIN_SPEC`, `REMAINING_SCREENS_SPEC`, `MENU_BUILDER_SPEC §7`, `UX_IMPROVEMENTS_SPEC`) override the `PHASE_*_BUILD` files.
4. **`PHASE_*_BUILD` files** are the fallback: sequencing, database schema, and anything no screen spec covers.

**Security and data rules are never overridden by a visual spec.** RLS, tenant isolation, server-side price recomputation, private document storage, and no-PII-in-URLs hold everywhere, no matter which file you are following.

---

## 3. Corrections & resolved conflicts

**⚠️ CORRECTION — `MENU_BUILDER_SPEC.md §7` is still active.**
`REDESIGN_V2_SPEC.md` states it supersedes "all of `MENU_BUILDER_SPEC.md`". That is **wrong** and is corrected here: it supersedes **§1–§6 only** (the builder). **§7 (Tables & QR)** remains the governing spec for table creation, `qr_token` generation, per-table PNG download, and the printable A4 table-QR sheet. `REDESIGN_V2_SPEC.md §9` adds the *restaurant-level* QR and storefront poster on top — the two are complementary, not alternatives.

**⚠️ CORRECTION — migration ledger renumbered for this repo (see §5).**
`0025` is **already used** by `0025_menu_payload_options.sql` (the options-ordering fix, applied). Per §5's own rule (never renumber an applied migration; the next new migration takes the next free number), **every migration in `REDESIGN_V2_SPEC.md` and `UX_IMPROVEMENTS_SPEC.md` is offset `+1` from the number printed in the original draft** — they occupy **`0026`–`0033`** here. The saved spec files and the ledger in §5 have already been corrected to the repo numbers; use those, not the draft numbers. This also folds in `0033_driver_arrival` (`UX §C.3`), which the upstream ledger omitted.

**⚠️ CORRECTION — emoji in `REDESIGN_V2_SPEC.md` are illustrative only.**
`§4.2`, `§4.3`, `§4.6` and `§5` sketch filter chips and badges with emoji (🔥 🌱 ⚡ ⭐ 🌶️ ✨). This does **not** override the non-negotiable **no-emoji rule** in `AGENTS.md` (emoji break RTL alignment and read as unprofessional). Every such glyph ships as a **`lucide-react` icon**, never an emoji. The emoji survive only inside the markdown spec as a design sketch. (This is the one place `MASTER_INDEX §2`'s "REDESIGN_V2 wins on iconography" yields: a convention that exists for correctness and professionalism is not a visual-taste question.)

**`AUDIT_FIX_PROMPTS.md` FIX 1 is already applied in this repo — not merely "absorbed".**
The upstream index says the options-ordering revenue bug is fixed by `REDESIGN_V2_SPEC.md §4.6` + prompt **R3**, and to not run FIX 1 separately. In *this* repo FIX 1 was already built end-to-end (migration `0025_menu_payload_options`, `menu_payload` carries option groups, the customer item-sheet renders them, the cart/request carry option ids, and `/api/orders` re-reads + re-prices options server-side into `options_snapshot`). So treat `REDESIGN_V2 §4.6` / prompt **R3** as **already satisfied** unless it adds something *beyond* options ordering. FIX 0, 2, 3, 4 are also done; FIX 5 stays deferred.

**`REDESIGN_V2_SPEC.md` and `UX_IMPROVEMENTS_SPEC.md` are now in the repo but not yet built.**
Both spec files exist on disk (saved with corrected encoding and repo migration numbers). **No `REDESIGN_V2` or `UX_IMPROVEMENTS` screen or migration (`0026`–`0033`) has been implemented yet** — every §4 row and §5 ledger entry that points at them is still *planned*, not done, until the corresponding agent prompt (`R1`–`R12`, `U1`–`U9`) is run and its migration approved. The shipped app remains as recorded in `AGENTS.md` › Current status. (The earlier screen specs — `AUTH_UI_SPEC`, `MENU_BUILDER_SPEC`, `ORDERS_DASHBOARD_SPEC`, `DRIVER_REPORTS_ADMIN_SPEC`, `REMAINING_SCREENS_SPEC` — live only in the project history and `AGENTS.md`, not as committed files; their outcomes are already applied and recorded there.)

**All theme instructions in older files are void.** Any mention of "river night", turquoise/teal `#2ED3B7`, "glass day", or glassmorphism is superseded by `REDESIGN_V2_SPEC.md §1–2` (warm stone neutrals + deep emerald accent, designed light *and* dark). Where an older file says "use the river night theme", read it as "use the tokens in `REDESIGN_V2_SPEC.md §1`". *(This is the target theme. Until prompt `R1` is run and the tokens are swapped in, the **shipped** theme is still the current river-night dark dashboard / light customer screens described in `AGENTS.md` — do not describe the new palette as live before it is built.)*

**Alert behaviour.** `ORDERS_DASHBOARD_SPEC.md §4` (sound + visual, arm-on-gesture, 20s re-chime) still applies **in-page**. `REDESIGN_V2_SPEC.md §11` adds Web Push for when the page is closed. Both are required; neither replaces the other.

---

## 4. Screen ownership map

The governing spec for each screen. Build a screen by reading **only** the files in its row, plus `AGENTS.md` and `REDESIGN_V2_SPEC.md §1–3`.

| Screen | Route | Governing spec(s) |
|---|---|---|
| Login / OTP / forgot password | `/login`, `/forgot-password` | `AUTH_UI_SPEC` §2, 3, 5, 7, 8 |
| Signup / onboarding / verification | `/signup`, `/onboarding` | `AUTH_UI_SPEC` §3.4, 4, 5, 6, 7 |
| Menu builder | `/dashboard/menu` | `REDESIGN_V2_SPEC` §7 (+ §5 tags, §6 sold-out, §10 trilingual) |
| Tables & table QR | `/dashboard/tables` | `MENU_BUILDER_SPEC` §7 |
| Restaurant QR & storefront poster | `/dashboard/tables` (أو صفحة الرموز) | `REDESIGN_V2_SPEC` §9 |
| Customer menu (dine-in & delivery) | `/t/[qr_token]`, `/r/[slug]` | `REDESIGN_V2_SPEC` §4, 5, 6, 8, 10 |
| Delivery checkout | `/r/[slug]` checkout | `REMAINING_SCREENS_SPEC` §A |
| Order tracking | after checkout | `REMAINING_SCREENS_SPEC` §A.3 |
| Live orders board | `/dashboard/orders` | `ORDERS_DASHBOARD_SPEC` §2–3, 5, 7–8 · `REDESIGN_V2_SPEC` §11 · `UX_IMPROVEMENTS_SPEC` §D |
| Kitchen view | `/dashboard/orders/kitchen` | `ORDERS_DASHBOARD_SPEC` §6 |
| Order archive | `/dashboard/orders/archive` | `REMAINING_SCREENS_SPEC` §C.3 |
| Driver app | `/driver` | `DRIVER_REPORTS_ADMIN_SPEC` §A · `UX_IMPROVEMENTS_SPEC` §C |
| Drivers management | `/dashboard/drivers` | `REMAINING_SCREENS_SPEC` §C.1 |
| Reports | `/dashboard/reports` | `DRIVER_REPORTS_ADMIN_SPEC` §B · `UX_IMPROVEMENTS_SPEC` §B |
| Settings | `/dashboard/settings` | `REMAINING_SCREENS_SPEC` §C.2 (+ `REDESIGN_V2_SPEC` §8 layout choice) |
| Subscription / upgrade | `/dashboard/subscription` | `REMAINING_SCREENS_SPEC` §C.4 |
| Getting-started checklist | dashboard | `REMAINING_SCREENS_SPEC` §C.5 |
| Admin panel | `/admin` | `DRIVER_REPORTS_ADMIN_SPEC` §C · `UX_IMPROVEMENTS_SPEC` §A |
| Landing page | `/` | `REMAINING_SCREENS_SPEC` §B |

---

## 5. Migration ledger

Apply in order. Never renumber; never edit an applied migration — add a new one.

| Range | Source | State |
|---|---|---|
| `0001`–`0024` | Phases 0–5 + auth/verification | Applied (in repo) |
| `0025_menu_payload_options` | `AUDIT_FIX_PROMPTS` FIX 1 (options ordering) | Applied (in repo) |
| `0026_menu_tags_prep_time` | `REDESIGN_V2_SPEC` §5 | Applied (in repo) |
| `0027_sold_out_autorestore` | `REDESIGN_V2_SPEC` §6 | Applied (in repo) |
| `0028_menu_layout` | `REDESIGN_V2_SPEC` §8 | Applied (in repo) |
| `0029_menu_third_language` | `REDESIGN_V2_SPEC` §10 | Applied (in repo) |
| `0030_push_subscriptions` | `REDESIGN_V2_SPEC` §11 | Applied (in repo) |
| `0031_item_cost` | `UX_IMPROVEMENTS_SPEC` §B.5 | Applied (in repo) |
| `0032_admin_cohorts` | `UX_IMPROVEMENTS_SPEC` §A | Applied (in repo) |
| `0033_driver_arrival` | `UX_IMPROVEMENTS_SPEC` §C.3 | Applied (in repo) |
| `0034_learned_prep` | `UX_IMPROVEMENTS_SPEC` §D.2 | Applied (in repo) |

**Rule:** the next new migration takes the next free number in this table. Add its row here in the same commit. Rows `0026`–`0033` are approved-in-spec but **not yet applied** — each is created and run only when its agent prompt executes. These numbers are the repo-correct ones (`+1` from the draft printed inside the spec bodies, which were written before `0025_menu_payload_options` existed); the saved spec files have been corrected to match.

---

## 6. Non-negotiable rules (apply to every file, always)

1. **Multi-tenancy via RLS** on every table; a user only ever reaches their own restaurant's data. Drivers reach only their own assigned orders.
2. **Server-side money.** Item prices, option `price_delta`s, delivery fees and totals are recomputed from the database. Never trust a client-sent price.
3. **`service_role` is server-only** and never reaches the browser.
4. **No PII in URLs** — no phone numbers, no coordinates, ever.
5. **Verification documents stay in the private bucket**, served only via short-lived signed URLs.
6. **The service worker never caches HTML** — restaurant devices are shared. Do not weaken this when adding push.
7. **Arabic-first, full RTL, mobile-first.**
8. **Colours come from tokens.** No literal hex in components.
9. **Never delete orders** — archive them.
10. **Show the SQL and wait for approval** before applying any migration.

---

## 7. Adding a new file (for the per-screen specs we build next)

Every new spec must:

1. **Open with a supersession line** naming the exact file **and section numbers** it replaces. Never write "supersedes all of X" — that is what caused the `MENU_BUILDER_SPEC §7` conflict in §3.
2. **Inherit, not restate, the design system.** Reference `REDESIGN_V2_SPEC.md §1–3`; never redefine colours, spacing, or the logo.
3. **Restate only the security rules it touches**, and never contradict §6.
4. **List any new migration** and add it to the ledger in §5.
5. **End with copy-paste agent prompts**, one task per prompt, each ending "print a summary + acceptance result, then STOP".
6. **Be registered here** — add a row to §1 and update the affected rows in §4, in the same commit.

Planned next files, one per screen: `SCREEN_ORDERS.md`, `SCREEN_DRIVER.md`, `SCREEN_REPORTS.md`, `SCREEN_ADMIN.md`, `SCREEN_AUTH.md`, `SCREEN_CHECKOUT.md`, `SCREEN_SETTINGS.md`, `SCREEN_LANDING.md`. As each is written, it takes over its row in §4 and the older spec's status changes to superseded here.

---

## 8. Agent prompt — orientation

Run this once at the start of any session:

```
Read MASTER_INDEX.md first, then AGENTS.md, then REDESIGN_V2_SPEC.md sections 1-3.

Tell me:
1. Which file governs the screen I am about to ask you to build
2. Which older sections it supersedes
3. The non-negotiable rules that apply

Then wait. Do not write code until I name the task.
```

Whenever a spec is superseded or a migration is applied, run:

```
Update MASTER_INDEX.md: adjust the file registry, the screen ownership map, and the
migration ledger to reflect what has changed. Do not change application code.
```
