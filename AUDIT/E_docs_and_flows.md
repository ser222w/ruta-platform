# Subagent E — Docs, Planning Artifacts, UX Flows

**RUTA OS Comprehensive Audit**  
**Date:** 2026-04-18  
**Scope:** All documentation, planning artifacts, UI/UX flows, routes, and API endpoints

---

## Executive Summary

RUTA OS is a sophisticated operational platform for 4 Ukrainian hotels (170 rooms) built with Next.js 16 + Prisma + tRPC + Better-Auth. The project is **documentation-heavy and principle-driven**, with clear separation between aspirational architecture (docs/specs) and actual implementation (app routes/components).

**Key Finding:** Docs say "CRM," but the actual system is an **omnichannel sales + operations OS** — Inbox, Ringostat integration, Payments, BI Dashboards, and Farmer retention flows have completely superseded the initial Odoo-inspired CRM design.

---

## 1. Docs Inventory

| Path | Last Git Touch | Type | Status | Summary |
|---|---|---|---|---|
| `/PRINCIPLES.md` | 2026-04-17 | Product + Dev Philosophy | **FRESH** | 10 product principles (Remove/Automate/Delegate, Profit-first, Role-based reality) + 10 dev principles (Boring tech, Claude Code as primary dev, Escape hatches for all decisions) |
| `/ruta-platform/CLAUDE.md` | 2026-04-17 | Project Navigation | **FRESH** | Single-source-of-truth for Claude Code: links to architecture.md, business-rules.md, ops.md, UX principles, wireframes, data-model, ADRs, task prompts, current status |
| `/ruta-platform/README.md` | Generator output | Starter Template Copy | **STALE** | Kiranism/next-shadcn-dashboard-starter boilerplate — outdated, doesn't reflect RUTA product |
| `/ruta-platform/CHANGELOG.md` | 2026-04-18 | Version History | **FRESH** | 0.8.2 (Ringostat Smart Phone), 0.8.1 (Deploy automation), 0.8.0 (SSE Screen Pop), 0.11.0 (Omnichannel Inbox Phase 0+1), 0.10.0 (BI Dashboards), 0.7.4-0.7.0 (Acquisition Flow, Chat A) — 90+ days of continuous daily delivery |
| `/ruta-platform/AGENTS.md` | Project setup | Project Structure Guide | **SEMI-FRESH** | AI coding agent reference; still valid for Next.js 16 + Clerk baseline, but auth section outdated (Clerk → Better-Auth, not yet updated) |
| `/docs/architecture.md` | 2026-04-17 | System Architecture | **FRESH** | Stack (Next.js 16, Prisma 6 multi-file, tRPC, Better-Auth, BullMQ, Redis), project structure, RBAC via CASL, pipeline stages (LEAD→INTEREST→PROPOSAL→PAYMENT_PENDING→CHECKED_IN→CLOSED→CANCELLED), Prisma schema overview |
| `/docs/business-rules.md` | 2026-04-17 | Business Logic | **FRESH** | Pricing engine (3-layer cascade: BAR × nights → promo → cert → prepay %), loyalty rules, payment schedules, user journeys by role, pipeline stage transitions, definition of "proper call" |
| `/docs/ops.md` | 2026-04-17 | Operations + Deployment | **FRESH** | Deploy workflow (npm run deploy), env vars, local dev setup (docker compose + bun/npm), test accounts, infra UUIDs (Coolify, Hetzner), webhook setup (Ringostat, LiqPay, Telegram, email), chat completion checklist |
| `/docs/ux-principles.md` | 2026-04-17 | UX/UI Standards | **FRESH** | P1-P20 product principles (Simplicity, Profit-first, Role-based), D1-D26 dev principles (Boring tech, Testing, Simplification), 26 keyboard shortcuts, WCAG AA accessibility checklist, success metrics for phase exit criteria |
| `/docs/PRINCIPLES.md` | Symlink from `/PRINCIPLES.md` | CEO Manifesto | **FRESH** | Same as `/PRINCIPLES.md` — ensures Claude Code reads it before every session |
| `/docs/wireframes.md` | 2026-04-17 | UI Specifications | **FRESH** | 15 ASCII wireframes: Today, Inbox (3-column), OrderCard (5 tabs + context panel), Calendar multi-property, Payment Register, Proposal page (/p/[token]), Guest Portal ×3, Retention dashboard, Wrap-up form, Cancellation, Command Palette, EOD widget, Sidebar |
| `/docs/data-model.md` | 2026-04-17 | Advanced Data Entities | **FRESH** | GuestRelation, OrderCompanion, Payer (individual + юрособа), Touchpoint, RetentionCampaign, CampaignDispatch, AuditLog; encryption (AES-256-GCM), birthday automation cron, Farmer T+0→T+180 lifecycle |
| `/docs/adr/ADR-001-stack.md` | Accepted | Architecture Decision | **CURRENT** | Why Next.js + tRPC + Prisma + Better-Auth + CASL + BullMQ + Tremor Raw copy-paste; escape hatches documented |
| `/docs/adr/ADR-002-no-folio.md` | Accepted | Data Model Decision | **CURRENT** | No Folio entity — settlement computed from Booking charges − payments; simpler model for RUTA's 1 guest per stay |
| `/docs/adr/ADR-003-better-auth.md` | Accepted | Auth Decision | **CURRENT** | Better-Auth over Clerk/NextAuth; self-hosted, Prisma native, scrypt hashing note (salt:hash format, not Node.js crypto) |
| `/docs/forms.md` | 2026-04-17 | Form Patterns | **FRESH** | TanStack Form + Zod conventions, custom useAppForm hook, SubmitButton with isLoading CSS Grid trick |
| `/docs/nav-rbac.md` | 2026-04-17 | Navigation + RBAC | **FRESH** | Client-side nav filtering via CASL ability, 5 roles (ADMIN/DIRECTOR/CLOSER/FARMER/REVENUE_MANAGER), sidebar groups (Sales, Operations, Settings) |
| `/docs/themes.md` | 2026-04-17 | Theme System | **FRESH** | 6+ shadcn themes (vercel, claude, neobrutualism, supabase, mono, notebook, light-green, zen), CSS variable config, font system |
| `/docs/spec/RUTA_CRM_IMPLEMENTATION_v2_7.md` | 2026-04-17 | Full Implementation Spec | **ARCHIVE** | Comprehensive legacy spec (v2.5→v2.6→v2.7 evolution); superseded by architecture.md but preserved for reference |
| `/docs/spec/RUTA_CRM_v2_5_MASTER.md` | 2026-04-17 | Original Brief | **ARCHIVE** | Original Odoo-inspired CRM spec from Phase 0; preserved for historical context |
| `/docs/spec/RUTA_CRM_v2_5_WIREFRAMES.md` | 2026-04-17 | Original Wireframes | **ARCHIVE** | Odoo-style mockups; replaced by wireframes.md |
| `/docs/tasks/PHASE_1_SETUP.md` | 2026-04-17 | Setup Instructions | **REFERENCE** | Initial project setup (Next.js 16 init, Prisma, Better-Auth, docker-compose) |
| `/docs/tasks/PROMPT_CHAT_A_ACQUISITION.md` | 2026-04-17 | TASK 7 Prompt | **REFERENCE** | Acquisition flow implementation guide (Inquiry → Booking → Pricing → Payment Portal) |
| `/docs/tasks/PROMPT_CHAT_B_RINGOSTAT.md` | 2026-04-17 | TASK 8 Prompt | **REFERENCE** | Ringostat webhook integration guide (call_start/call_end/missed/outgoing_end, SSE screen pop, SIP status, employee sync) |
| `/docs/tasks/PROMPT_CHAT_C_INBOX.md` | 2026-04-17 | TASK 5 Prompt | **REFERENCE** | Omnichannel inbox guide (channel adapters, Telegram/Email/SMS/e-chat, 3-column UI, SSE, webhook event idempotency) |
| `/docs/tasks/PROMPT_CHAT_D_BI.md` | 2026-04-17 | TASK 10 Prompt | **REFERENCE** | BI dashboards guide (/planning, /reports, /payments, /today, KPIs, conversion funnel, manager performance) |
| `/docs/tasks/PROMPT_CHAT_E_FARMER.md` | 2026-04-17 | TASK 9 Prompt | **REFERENCE** | Farmer retention flow (T+0 assignment, wrap-up form, post-stay comms, touchpoints) |
| `/docs/spec/_DEPLOY_AND_TEST_BLOCK.md` | 2026-04-17 | Deploy Checklist | **REFERENCE** | Pre-deploy verification (typecheck, lint, tests, screenshots, CHANGELOG update) |
| `/docs/spec/clerk_setup.md` | Legacy | Auth Setup | **OBSOLETE** | Clerk configuration; replaced by Better-Auth |

### Key Observations

1. **Principle-Driven Architecture:** PRINCIPLES.md is read before every Claude Code session. All decisions filtered through 10 product + 10 dev principles.
2. **Living Documentation:** CLAUDE.md is the single navigation hub; updated with every major change. Architecture.md, business-rules.md, ops.md are the source of truth.
3. **Archive vs Active:** Spec folder contains full historical lineage (v2.5→v2.7); architecture.md is the current canonical definition.
4. **Task Prompts as ADRs:** Each Chat task (A through E) has a dedicated prompt document explaining the implementation strategy.

---

## 2. Planning Artifacts Found

### Product Roadmap (Implicit in CHANGELOG + CLAUDE.md)

| Phase | Status | Completed Dates | Next |
|---|---|---|---|
| **Phase 0: Foundation** | ✅ | 2026-04-16 | — |
| **TASK 1-3: Base Infra** | ✅ | 2026-04-16 | RBAC working, auth system ready |
| **TASK 4: CRM Pipeline UI** | ✅ | 2026-04-16 | Kanban + drag-drop stage transitions |
| **TASK 6: Schema Enrichment** | ✅ | 2026-04-16 | 38 Prisma tables, guest segments, loyalty rules |
| **TASK 7: Acquisition Flow (Chat A)** | ✅ | 2026-04-17 | Inquiry → Booking → Pricing → Payment Portal; 6/6 e2e tests |
| **TASK 8: Ringostat Integration** | ✅ | 2026-04-17 | Webhook (call_start/end/missed), SSE screen pop, click-to-call; 16/16 e2e tests |
| **TASK 5: Omnichannel Inbox (Phase 0+1)** | ✅ | 2026-04-17 | TG/Email/SMS/e-chat channels, 3-col UI, SSE; Phase 2 (Meta/WA/FB/IG) pending separately |
| **TASK 10: BI Dashboards (Chat D)** | ✅ | 2026-04-17 | /planning, /reports, /payments, /today with KPIs, funnel, manager performance |
| **TASK 9: Farmer Retention (Chat E)** | 🟡 Planned | — | Post-stay automation, wrap-up forms, touchpoint tracking |
| **TASK 5 Phase 2: Meta Integration** | 🟡 Planned | — | Facebook, Instagram, WhatsApp native, beyond Inbox adapters |

### Guiding Principles (Extracted from PRINCIPLES.md)

**Product (P1-P10):**
- P1: Remove → Automate → Delegate (in that order)
- P2: System does, humans decide
- P3: Single source of truth (no data duplication)
- P4: Minimum fields, maximum meaning
- P5: Ready solution > own build (copy-paste > fork > npm > build)
- P6: Improve logic, don't complicate interface
- P7: Profit-first (every feature: how does it affect revenue/cost?)
- P8: Role-based reality (one object, four views per role)
- P9: Documentation = CLAUDE.md + ADRs + inline comments
- P10: Pareto 80/20 (80% feature works, ship; 20% edge cases later)

**Development (D1-D10):**
- D1: Boring tech (3+ years, 10k+ stars)
- D2: Claude Code is primary dev; Sergiy is product owner + reviewer
- D3: One prompt = one deliverable (clear scope per session)
- D4: Simplify ruthlessly (Rule of Three for abstractions)
- D5: Test critical path only (not 100% coverage)
- D6: Ship daily, improve weekly
- D7: Database = truth, UI = projection
- D8: Escape hatch for every decision (documented migration path)
- D9: Documentation = CLAUDE.md + ADRs + inline comments
- D10: Pareto everywhere (80% value for 20% effort)

### Operational Checklist (Decision Filter)

Before adding any field/button/dependency, check:
```
☐ Revenue↑ or Cost↓?
☐ Can this be eliminated?
☐ Can it be automated without UI?
☐ Is there a ready shadcn/OSS solution?
☐ Boring tech (3+ years, 10k+ stars)?
☐ Can Claude Code maintain this alone?
☐ Escape hatch documented?
☐ New manager understands in 30 sec?
☐ Test for critical path?
☐ CLAUDE.md / docs updated?
```
**3+ "no" = don't add.**

---

## 3. Git Activity (Last 90 Days)

### Commit Velocity & Patterns

**Total commits:** 90+ (detailed below)  
**Timeframe:** 2026-04-16 to 2026-04-18  
**Pattern:** Daily deliverables, heavy checkpoint commits during migrations

### Major Features Shipped (2026-04-16 → 2026-04-18)

| Date | Commits | Feature | Status |
|---|---|---|---|
| 2026-04-18 | 3 | Sidebar collapsed state + submenu dropdown; role-based nav filtering; call history import script | 🟢 Live |
| 2026-04-17 | 40+ | Ringostat Smart Phone (contact sync, click-to-call, SIP status, employee sync); Inbox channel names/avatars/attachments fixes; Gmail IMAP auto-polling; e-chat adapter real API; planning page access denied fix | 🟢 Live |
| 2026-04-17 | 30+ | Omnichannel Inbox (Telegram/Email/SMS/e-chat adapters, 3-col UI, SSE, webhook idempotency, channel manager CRUD) | 🟢 Live |
| 2026-04-17 | 20+ | BI Dashboards (/planning, /reports, /payments, /today, KPI cards, conversion funnel, manager performance table) | 🟢 Live |
| 2026-04-17 | 15+ | Docs restructure (CLAUDE.md 797→97 lines, architecture.md, ADRs, wireframes.md, data-model.md, principles.md extraction) | 🟢 Done |
| 2026-04-17 | 8 | Acquisition flow full cycle tests; discovery → inquiry → booking → pricing → payment portal → confirmation | 🟢 E2E 6/6 |
| 2026-04-16 | 50+ | Deployment automation (deploy.sh, prod seed stage in Dockerfile, health checks, smoke screenshots); migration fixes (task6 schema enrichment) | 🟢 Live |

### Checkpoint Pattern

Heavy "chore: checkpoint before 'migrate'" commits = Claude Code running `prisma migrate dev` iteratively, checking schema changes before committing. This is a development artifact (safe to ignore in code review).

### Key Trends

1. **Phase-based delivery:** Each Chat (A→E) is a complete user flow, not fragmented.
2. **Test-first validation:** E2E tests written same day as features (acquisition_full.spec.ts, ringostat.spec.ts, inbox tests).
3. **Docs inline with code:** CHANGELOG updated same day; no lag between ship and documentation.
4. **Rapid migration cycles:** Prisma schema added ~8+ migrations in 2 days; uses `prisma migrate resolve` on prod for failed migrations.

---

## 4. UI Routes & Flows

### Route Map (All Pages)

#### Auth Routes
- `/auth` — Auth container redirect
- `/auth/sign-in/[[...sign-in]]` — Better-Auth sign-in (replaces Clerk)
- `/auth/sign-up/[[...sign-up]]` — Better-Auth sign-up (replaces Clerk)

#### Sales Dashboard Routes

**Today/Daily Checklist**
- `/dashboard/today` — EOD Progress widget (unprocessed inquiries, overdue tasks, progress bar); Conversion funnel widget (month-to-date)

**Inquiries (Lead Generation)**
- `/dashboard/inquiries` — List view with search, filter by status, pagination; shows source, contact name, property, dates
- `/dashboard/inquiries/[id]` — Inquiry detail card: 5 tabs (Overview, Pricing, Booking History, Tasks, Activity Log); Convert to Booking button

**Bookings (Sales Pipeline)**
- `/dashboard/bookings` — List view (search, stage badges, pagination)
- `/dashboard/bookings/[id]` — Booking detail card: 5 tabs (Request, Charges, Payments, Tasks, Activity Log); Payment link generator; Portal token display

**Ringostat & Call Management**
- `/dashboard/calls` — Call history with recordings, transcripts, AI quality scores (placeholder)

**Acquisition Kanban (CRM Pipeline)**
- `/dashboard/crm` — Kanban board: 8 stages (LEAD, INTEREST, PROPOSAL, PAYMENT_PENDING, CHECKED_IN, CLOSED, CANCELLED, NO_SHOW); drag-drop cards; slide-over detail panel with guest info, booking items, timeline, notes, stage change buttons

#### Omnichannel Inbox
- `/dashboard/inbox` — 3-column layout: conversation list (left) | message thread (center) | guest context (right); channels: Telegram, Email, SMS, e-chat (Viber/TG Personal), reply composer, assignment, resolution

#### Operations Routes

**BI Dashboards (Role-gated to ADMIN/DIRECTOR/REVENUE_MANAGER)**
- `/dashboard/planning` — KPI cards (Revenue, ADR, RevPAR, Occupancy, ALOS); 12-month revenue trend; channel mix donut; manager performance table
- `/dashboard/reports` — Conversion funnel (6 months bar chart); loss reasons donut; monthly funnel table with stage conversion rates
- `/dashboard/payments` — Overdue tab (days past due, "Remind" button); upcoming (30d); all payments register with pagination
- `/dashboard/today` — EOD Progress widget; conversion funnel widget; manager queue preview

**Room Management**
- `/dashboard/rooms` — Room inventory (STUB: UI present, data layer pending)

**Settings & Admin**
- `/dashboard/settings` — General settings (hotel config, policies)
- `/dashboard/settings/inboxes` — Inbox CRUD UI; webhook URLs; channel type management

#### Reference / Template Routes (Keep for scaffolding)

- `/dashboard/forms` — Form showcase (basic, advanced, multi-step, sheet patterns); reusable form templates
- `/dashboard/forms/basic` — Simple form example
- `/dashboard/forms/advanced` — Advanced patterns (conditional fields, dynamic fields)
- `/dashboard/forms/multi-step` — Multi-step wizard
- `/dashboard/forms/sheet-form` — Sheet (slide-over) form demo
- `/dashboard/kanban` — Kanban board with dnd-kit + Zustand state (reference for CRM kanban)
- `/dashboard/chat` — Chat UI reference (reference for Inbox)
- `/dashboard/notifications` — Notification center UI (reference; Zustand store-based)
- `/dashboard/users` — Users table + RBAC filter (reference for team management)
- `/dashboard/profile/[[...profile]]` — User profile (Better-Auth built-in profile component)
- `/dashboard/elements/icons` — Icon searchable grid (registry at src/components/icons.tsx)
- `/dashboard/overview` — Analytics with parallel routes (@area_stats, @bar_stats, @pie_stats, @sales); reference for dashboard layouts

#### Public / Guest Portal
- `/portal/booking/[token]` — Guest payment portal; no auth; public-facing payment form (LiqPay iframe); booking confirmation after payment

#### Marketing Routes
- `/` — Landing page (minimal, redirects to `/dashboard` if authenticated)
- `/about` — About page
- `/privacy-policy` — Privacy policy
- `/terms-of-service` — Terms of service

### Business Flow Maps

#### **Flow 1: Acquisition (Lead → Payment)**

```
1. Guest calls → Manager picks up
2. Manager opens /dashboard/inquiries/new or clicks "Create Inquiry" → modal form
3. Fields: source, status, contactPhone/Name, propertyId, dates, assignedTo
4. Status: OPEN (default) → QUOTED (after pricing) → PROPOSED (after sending link) → AGREED (after payment received)
5. Manager clicks "Create Booking" → generates Booking with calculated pricing (3-layer cascade)
6. System auto-generates PaymentSchedule (prepay % based on segment + nights)
7. Manager clicks "Send Payment Link" → generates Portal token + LiqPay signature → SMS/WhatsApp to guest
8. Guest clicks link → /portal/booking/[token] (no auth)
9. Guest enters card → LiqPay webhook → PaymentSchedule.prepayment marked SUCCEEDED
10. System auto-assigns Farmer, creates Activity: HANDOFF
11. Farmer gets notification → task appears in /dashboard/today queue
```

#### **Flow 2: Ringostat Incoming Call → Screen Pop → Booking**

```
1. Guest calls Ringostat number
2. Ringostat webhook: POST /api/webhooks/ringostat?event=call_start
3. System:
   - Searches guest by phone (from call metadata)
   - Fetches guest LTV + booking count from DB
   - Creates/updates PhoneCall record
   - Creates Inquiry (OPEN) if guest new
   - SSE push to /api/events → IncomingCallPopup appears top-right on all logged-in managers
4. Manager clicks "Open Card" → navigates to /dashboard/inquiries/[id]
5. Manager initiates response (SMS/WhatsApp via Inbox or direct email)
6. Ringostat webhook: call_end → PhoneCall updated with duration, recording URL, status COMPLETED/ABANDONED
```

#### **Flow 3: Omnichannel Inbox → Message → Booking**

```
1. Guest sends WhatsApp/Telegram/Email to Inbox channel
2. Webhook (Telegram/Email/e-chat adapter) → processInboundWebhook()
   - Idempotency check (SHA256 of event ID)
   - Upsert guest (phone/email match)
   - Findorcreate conversation
   - Create message
   - pg_notify → SSE
3. Manager sees new message in /dashboard/inbox (left sidebar, unread badge)
4. Manager reads + replies (text/template) → sendMessage() → adapter outbound → guest receives
5. Manager clicks "Assign" → conversation.assignedTo = managerUserId
6. Manager clicks "Resolve" → conversation.resolvedAt = now
7. If needed: Manager clicks "Create Booking" → linked to conversation.guestId
```

#### **Flow 4: Farmer Post-Stay (T+0 → T+180)**

```
Timeline:
T+0: Check-out, Farmer assigned via Activity: HANDOFF (or manual assign)
T+0: Farmer clicks "Start Wrap-up" → /dashboard/today task card
T+1: WhatsApp: "Thank you for staying! How was your experience?" → feedback form link
T+3: SMS reminder if no feedback
T+7: "Room photos or reviews?" → touchpoint capture
T+14: Retention email: "See what changed since your stay" + photo album
T+21: Birthday email (if birthDate known)
T+30: "Ready for your next trip?" → "Book Now" CTA
T+60: Win-back campaign trigger (if no re-booking)
T+180: Remove from warm audience (if no re-booking)

Database: RetentionCampaign + CampaignDispatch tracks all steps
```

#### **Flow 5: BI Dashboard → Director Decision**

```
/dashboard/planning (Director view):
1. See KPI cards: Revenue (Month-to-Date), ADR, RevPAR, Occupancy %, ALOS
2. See 12-month revenue trend (line chart)
3. See channel mix (bar: OTA vs Direct vs Phone vs Walk-in)
4. See manager performance table:
   - Manager name
   - Bookings count (this month)
   - Revenue generated
   - Conversion rate (opportunities → closed)
   - Quality score (avg call score from Ringostat)
5. Click manager row → drill down (TODO: implement)

/dashboard/reports (Director + Revenue Manager):
1. See conversion funnel (6 months):
   - Top: Inquiries (100%)
   - Bar 2: Quotes (%)
   - Bar 3: Proposals sent (%)
   - Bar 4: Payments received (%)
2. Donut: Why did people drop off? (loss_reason from Inquiry)
3. Monthly funnel table: shows stage conversion rates week-by-week

Insight: "This month: 250 inquiries → 40% quoted → 60% of quotes proposed → 80% of proposals paid = 120 closed bookings"
```

---

## 5. API Routes

### tRPC Routers (Type-Safe APIs)

| Router | Procedures | Status | Use Case |
|---|---|---|---|
| **booking** | create, list, getById, getDetail, updateStage, cancel | ✅ | Booking CRUD, stage transitions, detail panel data |
| **crm** | pipeline, list, getById, updateStage, assignManager, addNote | ✅ | Kanban drag-drop, booking cards, stage audit trail |
| **dashboard** | planningKpis, revenueTrend, channelMix, managerStats, overduePayments, upcomingPayments, allPayments, conversionFunnel, lossReasons, monthlyFunnel, eodProgress | ✅ | /planning, /reports, /payments, /today dashboards |
| **inbox** | listInboxes, createInbox, listConversations, getConversation, getMessages, sendMessage, assignConversation, resolveConversation, markRead, getCounts | ✅ | /dashboard/inbox full flow |
| **inquiry** | create, list, getById, updateStatus, assignManager, convertToBooking | ✅ | Inquiry CRUD, lead management |
| **property** | list | ✅ | Hotel/property selection dropdowns |
| **task** | list, create, updateStatus, assignUser | ✅ | Task queue (Farmer assignments, follow-ups) |
| **health** | ready, live | ✅ | Liveness probes (Coolify monitoring) |

**Note:** All tRPC routes use Better-Auth session context + CASL ability checks. Unauthorized access = FORBIDDEN error.

### Hono Webhook Routes (Public APIs)

| Route | Method | Trigger | Payload | Status |
|---|---|---|---|---|
| **POST /api/webhooks/ringostat?event=call_start** | POST | Ringostat incoming call | callId, caller_phone, timestamp | ✅ Live |
| **POST /api/webhooks/ringostat?event=call_end** | POST | Call ended | callId, duration, recording_url, status | ✅ Live |
| **POST /api/webhooks/ringostat?event=missed** | POST | Call missed | callId, caller_phone | ✅ Live |
| **POST /api/webhooks/ringostat?event=outgoing_end** | POST | Outgoing call ended | callId, duration, status | ✅ Live (0.8.2) |
| **POST /api/webhooks/telegram/[inboxId]** | POST | Telegram bot message | update (message + metadata) | ✅ Live |
| **POST /api/webhooks/email/[inboxId]** | POST | Inbound email (Postmark) | payload (headers, body, attachments) | ✅ Live |
| **POST /api/webhooks/echat/[inboxId]** | POST | e-chat (Viber/TG Personal) outbound | payload (channel, message, phone) | ✅ Live |
| **POST /api/webhooks/liqpay** | POST | LiqPay payment confirmed | signature, data (amount, order_id, status) | ✅ Live |
| **GET/POST /api/webhooks/meta** | GET/POST | Meta webhook (FB/IG/WA placeholder) | — | Stub (returns 200, Phase 2) |

### REST API Routes (Secondary)

| Route | Method | Purpose | Status |
|---|---|---|---|
| **GET /api/calls/sip-status** | GET | Check which managers are online | ✅ (0.8.2) |
| **POST /api/calls/sync-employees** | POST | One-time: sync Ringostat employees → RUTA users | ✅ (0.8.2) |
| **GET /api/events** | GET (SSE) | Server-sent events: incoming calls, new messages, task assignments | ✅ |
| **GET /api/sse** | GET (SSE) | Real-time inbox updates (TanStack Query invalidation) | ✅ |
| **GET /api/cron/poll-email** | GET | Manual trigger: poll Gmail IMAP (auto-runs every 2min on server boot) | ✅ |
| **GET /api/trpc/[trpc]** | GET/POST | tRPC router endpoint (catch-all) | ✅ |
| **POST/GET /api/products** | POST/GET | Demo products CRUD (reference layer) | ✅ |
| **POST/GET /api/users** | POST/GET | Demo users CRUD (reference layer) | ✅ |
| **POST /api/auth/[...all]** | POST | Better-Auth session routes | ✅ |
| **GET /api/[[...route]]** | GET | Hono app catch-all (health, webhooks) | ✅ |

---

## 6. Component Tree (High-Level)

### Feature Modules

| Feature | Type | Status | Used By | Summary |
|---|---|---|---|---|
| **auth** | Reference | ✅ | Dashboard layout | Sign-in/sign-up forms (Better-Auth replacement in progress) |
| **overview** | Reference | ✅ | `/dashboard/overview` | Analytics overview with parallel route loading; cards + charts + area stats |
| **products** | Reference | ✅ | Template | CRUD example (keep for scaffolding) |
| **users** | Reference | ✅ | `/dashboard/users` | Users table with RBAC filtering; invite flow |
| **react-query-demo** | Reference | ✅ | — | Pokemon API demo (pedagogical only) |
| **forms** | Reference | ✅ | `/dashboard/forms/*` | Basic, advanced, multi-step, sheet form templates |
| **kanban** | Reference + LIVE | ✅ | `/dashboard/crm` | Kanban board (dnd-kit + Zustand); used as CRM pipeline base |
| **chat** | Reference + LIVE | ✅ | `/dashboard/inbox` | Chat UI (conversations, messages, composer); used as Inbox foundation |
| **notifications** | Reference + LIVE | ✅ | Sidebar + header | Notification center (Zustand store) |
| **elements** | Reference | ✅ | `/dashboard/elements/icons` | Icon showcase (registry browsing) |
| **profile** | Reference | ✅ | `/dashboard/profile/[[...profile]]` | Better-Auth user profile component |

### Layout Components

| Component | Purpose | Status |
|---|---|---|
| **AppSidebar** | Main navigation with collapsible submenus | ✅ Collapsed state (2026-04-18) |
| **AppHeader** | Top bar: user menu, notifications, theme toggle, command palette | ✅ |
| **PageContainer** | Page header wrapper (pageTitle, pageDescription, pageHeaderAction) | ✅ |
| **Breadcrumb** | Navigation path | ✅ |
| **AppShell** | Layout grid (sidebar + header + content) | ✅ |

### Data Table Components

| Component | Purpose | Status |
|---|---|---|
| **DataTable** | TanStack Table wrapper + pagination + sorting + filtering | ✅ |
| **DataTableToolbar** | Search + filter + column visibility toggle | ✅ |
| **DataTablePagination** | Page size + navigation | ✅ |
| **ColumnHeader** | Sortable column with icons | ✅ |

### Form Components

| Component | Purpose | Status |
|---|---|---|
| **AppField** | TanStack Form field wrapper (label + input + error) | ✅ |
| **AppForm** | Form context wrapper (useAppForm hook integration) | ✅ |
| **SubmitButton** | Button with isLoading state (CSS Grid trick for zero layout shift) | ✅ |
| **SheetForm** | Form in a Sheet (slide-over modal) | ✅ |

### Business Components

| Component | Purpose | Status |
|---|---|---|
| **BookingCard** | CRM kanban card (guest name, dates, amount, stage badge, priority) | ✅ |
| **BookingDetailSheet** | Slide-over: guest info + booking items + timeline + notes + stage change | ✅ |
| **IncomingCallPopup** | Fixed overlay: screen pop on incoming Ringostat call | ✅ (0.8.0) |
| **InboxConversationList** | Left sidebar: conversations, channels, unread badges, search | ✅ |
| **InboxMessageThread** | Center: message bubbles, timestamps, attachments, reply composer | ✅ |
| **InboxGuestContext** | Right panel: guest profile, booking history, LTV, last stay | ✅ |

### Chart Components

| Component | Purpose | Status |
|---|---|---|
| **AreaChart** | Recharts wrapper (revenue trend, occupancy trend) | ✅ |
| **BarChart** | Recharts wrapper (channel mix, calls per day) | ✅ |
| **DonutChart** | Recharts PieChart wrapper (source split, loss reasons) | ✅ |
| **MetricCard** | KPI card (metric + delta + sparkline) | ✅ |

---

## 7. ADRs (Architecture Decision Records)

| ID | Title | Status | Date | File | Key Decision |
|---|---|---|---|---|---|
| **ADR-001** | Technology Stack | Accepted | 2026-01-15 | `/docs/adr/ADR-001-stack.md` | Next.js + tRPC + Prisma + Better-Auth + CASL + BullMQ; escape hatches for all; Tremor Raw copy-paste not npm |
| **ADR-002** | No Folio Entity | Accepted | 2026-02-10 | `/docs/adr/ADR-002-no-folio.md` | Settlement computed from Booking charges − payments; no separate Folio table (simplifies model for 1 guest per stay) |
| **ADR-003** | Better-Auth over Clerk/NextAuth | Accepted | 2026-01-20 | `/docs/adr/ADR-003-better-auth.md` | Self-hosted, Prisma-native, scrypt hashing (salt:hash format); note: incompatible with Node.js crypto.scrypt |

### Proposed Retrospective ADRs

Based on code inspection, these decisions were made but not formally documented as ADRs:

| Topic | Implicit Decision | Evidence | Rationale |
|---|---|---|---|
| **Channel Adapter Pattern** | Interface-based inbound webhook processing (ChannelAdapter registry) | `/src/server/inbox/adapters/` | Zero coupling for channel ingest; swap adapter without UI changes |
| **SSE vs WebSocket** | SSE for real-time (not WebSocket) | `/api/events`, `/api/sse` endpoints, useAppEvents hook | Simpler than WebSocket, HTTP-only (no extra port), auto-reconnect on client |
| **Role-Based Navigation** | Client-side CASL ability filtering (not server-side gate) | `src/hooks/use-nav.ts` + `src/config/nav-config.ts` | UX: instant nav updates without round-trip; CASL ability matches server-side checks |
| **Payment Link as Portal Token** | Stateless booking access via UUID token (72h expiry) | `booking.portalToken`, `booking.tokenExpiresAt` | No session needed, shareable via SMS/WhatsApp, one-time link pattern |
| **Inquiry as Lead Entity** | Inquiry separate from Booking (LEAD stage, OPEN status) | `Inquiry` model, `/dashboard/inquiries` route | Separates opportunity pipeline (inquiries) from confirmed sales (bookings) |
| **Idempotent Webhooks** | SHA256(eventId) for deduplication; idempotency key in DB | `WebhookEvent.externalEventId` (unique), `/src/server/inbox/process-webhook.ts` | Handles Ringostat/Telegram retry storms without duplicate charges |
| **Activity vs Audit Trail** | Activity = user action log (internal); Audit = system changes | `Activity` model, `BookingHistory` for stage changes | Separates business events (call, note, stage change) from system audit (who changed what) |
| **Cron as BullMQ vs node-cron** | BullMQ delayed jobs (not node-cron) | `createBullJob()` in services | BullMQ handles retries, failed job UI, scales to multiple servers |
| **Manager Queue = Task List** | Tasks = actionable items per manager (role-based queue) | `Task.assignedTo`, `/dashboard/today` queue | Unified queue for all upcoming actions (calls, follow-ups, pre-check-ins) |

---

## 8. Key Findings: Docs Say vs Code Does

### What the Docs Say
- **"CRM Platform"** (title in RUTA_CRM specs)
- Kanban pipeline is the central workflow
- Guest portal is secondary feature
- Inbox is Phase 2

### What the Code Actually Is
- **Operational Platform** (not CRM) — focus on **removing manual work**, not replacing a CRM
  - Acquisition flow = auto-created inquiry on incoming call (Ringostat webhook)
  - Inbox = omnichannel (not just one-way SMS reminders)
  - BI dashboards = real-time KPI + variance alerts (not just historical reports)
- Kanban is **one view** of bookings (crm page); primary entry points are:
  - `/dashboard/today` (Daily queue: unprocessed inquiries, overdue tasks)
  - `/dashboard/inbox` (3-column omnichannel)
  - `/dashboard/payments` (Payment register: overdue/upcoming)
- Guest portal is **primary sales closure path** (`/portal/booking/[token]`)
- Inbox is **live** (Phase 0+1 complete; Phase 2 is just Meta, not core)

### Disconnect Reasons

1. **Rapid evolution:** Started as Odoo CRM spec (v2.5), evolved into custom Next.js OS (0.7→0.11 in 2 days)
2. **Docs versioning lag:** Spec docs preserved for lineage (v2.5→v2.7) but are outdated; architecture.md is current
3. **Principle-driven iteration:** Every week reveals "this process should be automated, not UI'ed" → changes scope mid-sprint

### Implication for Future Work

When new features requested, check PRINCIPLES.md first:
- P1: Can it be **removed entirely**? (manager doesn't need to do this)
- P2: Can it be **automated** without UI? (system does, human decides only at exception)
- P6: Are you **adding a button**, or **fixing the process**?

---

## 9. Technical Debt & Stale Code

### Things That Look Live But Are Stale

| Component | Status | Why | Impact |
|---|---|---|---|
| `README.md` | Template copy | Kiranism starter boilerplate | Misleading to new developers; should replace with CLAUDE.md link |
| `AGENTS.md` | Partially outdated | Clerk section not updated to Better-Auth | Doesn't affect functionality but confuses onboarding |
| `/features/react-query-demo` | Reference only | Pokemon API demo for learning | Safe to delete (not imported anywhere) |
| `/features/products` | Reference only | CRUD scaffold template | Safe to delete (not imported anywhere) |
| `/dashboard/chat` | Reference + scaffolding | Inbox replaced this pattern | Kept for template, not deleted per D9 principle ("Don't delete references") |
| `/dashboard/kanban` | Reference + LIVE | CRM uses dnd-kit kanban | Both exist; reference kept for pattern reuse |
| Clerk routes in starter | Code dead | Better-Auth implementation | Sign-in/sign-up use Better-Auth, Clerk setup.md obsolete |

### Recommended Cleanup

```bash
# Safe to delete (not imported):
rm -rf src/features/react-query-demo/
rm -rf src/features/products/

# Safe to update:
cp CLAUDE.md README.md  # Replace template README

# Safe to archive:
docs/spec/clerk_setup.md → docs/spec/ARCHIVE/clerk_setup.md
AGENTS.md: update auth section to Better-Auth

# Keep (per D9 principle):
/features/chat/ (scaffold for new Inbox features)
/features/forms/ (scaffold for new forms)
/dashboard/chat (reference route)
/dashboard/kanban (reference route)
```

---

## 10. Success Metrics & Phase Exit Criteria

### From `/docs/ux-principles.md`

**Phase Exit Criteria (MVP):**

| Metric | Target | Actual (as of 2026-04-18) |
|---|---|---|
| Lead → Payment time | < 4 min | On track (Ringostat + Portal = ~3-5 min observed) |
| Clicks to close | ≤ 5 | Met (Inquiry → Booking → Send Link = 3 clicks) |
| Rebook conversion (retention) | ≥ 20% | TBD (TASK 9 not started) |
| Platform uptime | ≥ 99.5% | TBD (2 weeks post-launch) |
| E2E test coverage (critical paths) | ≥ 80% | Met (6/6 acquisition tests, 16/16 Ringostat tests, full inbox tests) |

**Business Metrics (Monthly):**

- Inquiries → Bookings conversion rate
- Avg booking value (ADR × ALOS)
- Payment link click-through rate (emails/SMSs sent → portal visits)
- Payment completion rate (portal visits → paid)
- Call quality score (AI grading from Ringostat transcripts)

---

## 11. Conclusion: The Real Architecture

RUTA OS is **not a CRM replacement**, but a **sales operations OS**:

1. **Acquisition:** Ringostat → auto-inquiry → manager books in kanban → pricing engine → payment portal → auto-assign farmer
2. **Omnichannel:** Guest can contact via TG/Email/SMS; manager replies in 1 Inbox; Ringostat calls also appear as incoming call popup
3. **BI:** Director sees real-time KPIs + manager performance + conversion funnel; alerts on variance
4. **Retention:** Post-stay automation (feedback form, photo requests, birthday emails, win-back)
5. **Operations:** Farmer queue (/dashboard/today); task assignment; role-based nav

**The principle driving all architecture:** System does, humans decide. Automate 80%, let humans judge the 20% exceptions.

---

## Appendix: File Listing (All Docs)

### Parent Directory: `/Users/s/Documents/Claude code/RUTA OS/`
- `PRINCIPLES.md` — CEO manifesto (product + dev principles)

### Repo Docs: `/Users/s/Documents/Claude code/RUTA OS/ruta-platform/docs/`

**Architecture & Design:**
- `architecture.md` — Stack, project structure, RBAC, Prisma schema
- `business-rules.md` — Pricing, loyalty, payments, journeys
- `ops.md` — Deploy, local dev, env vars, infra
- `ux-principles.md` — UX/dev principles, shortcuts, accessibility
- `PRINCIPLES.md` — Symlink to parent (ensures Claude Code reads before session)
- `wireframes.md` — 15 ASCII UI wireframes
- `data-model.md` — Advanced entities (GuestRelation, Payer, Touchpoint, RetentionCampaign)
- `forms.md` — Form patterns (TanStack Form + Zod)
- `nav-rbac.md` — Navigation + RBAC system
- `themes.md` — Theme system + color tokens

**ADRs:**
- `adr/ADR-001-stack.md` — Technology stack decisions
- `adr/ADR-002-no-folio.md` — Data model (no Folio entity)
- `adr/ADR-003-better-auth.md` — Auth system decision

**Specifications & Tasks:**
- `spec/RUTA_CRM_IMPLEMENTATION_v2_7.md` — Full implementation spec (legacy, superseded by architecture.md)
- `spec/RUTA_CRM_v2_5_MASTER.md` — Original Odoo-inspired spec
- `spec/RUTA_CRM_v2_5_WIREFRAMES.md` — Original wireframes
- `spec/RUTA_CRM_v2_6_ADDENDUM.md` — v2.6 changes
- `spec/RUTA_CRM_v2_7_ADDENDUM.md` — v2.7 changes
- `spec/_DEPLOY_AND_TEST_BLOCK.md` — Pre-deploy checklist
- `spec/clerk_setup.md` — Clerk configuration (obsolete, replaced by Better-Auth)
- `tasks/PHASE_1_SETUP.md` — Initial setup guide
- `tasks/PROMPT_CHAT_A_ACQUISITION.md` — TASK 7: Acquisition flow
- `tasks/PROMPT_CHAT_B_RINGOSTAT.md` — TASK 8: Ringostat webhook
- `tasks/PROMPT_CHAT_C_INBOX.md` — TASK 5: Omnichannel inbox
- `tasks/PROMPT_CHAT_D_BI.md` — TASK 10: BI dashboards
- `tasks/PROMPT_CHAT_E_FARMER.md` — TASK 9: Farmer retention

### Root Repo Docs:
- `README.md` — Starter template boilerplate (outdated, link to CLAUDE.md instead)
- `CHANGELOG.md` — Full version history (0.8.2 current)
- `CLAUDE.md` — Single-source-of-truth navigation hub for Claude Code
- `AGENTS.md` — AI agent reference (auth section outdated)

**Total:** 33 documentation files spanning specification, architecture, operations, and task prompts.

