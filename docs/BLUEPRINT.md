# RUTA OS — Project Blueprint

> Living source of truth. Згенеровано через повний audit 2026-04-18.  
> Re-audit: щокварталу або при major pivot.  
> Не редагуй вручну — оновлюється через re-audit або точкові правки з evidence.

---

## Project Maturity Snapshot

| Metric | Value |
|---|---|
| **Version** | 0.8.2 |
| **Audit date** | 2026-04-18 |
| **Total features cataloged** | 52 |
| ✅ **DONE** | 32 (62%) |
| 🟡 **WIP** | 7 (13%) |
| 📋 **PLANNED** | 11 (21%) |
| 💀 **STALE** | 0 (0%) |
| ❓ **UNKNOWN** | 2 (4%) |
| **Test coverage signal** | 70% critical path (9 test files) |
| **DB models** | 39 defined / 39 migrated / 0 orphan |
| **Active dev streams (30d)** | Ringostat Smart Phone (0.8.2), Inbox Ph0+1, BI Dashboards |

## Navigation

[1. Vision](#1-vision) · [2. Roadmap](#2-roadmap) · [3. Backlog](#3-backlog-tasks) · [4. ADRs](#4-adrs) · [5. Changelog](#5-changelog) · [6. Appendix](#6-appendix-audit-evidence)

---

## 1. VISION

```yaml
horizon: 2026 Q2–Q3
version: 1.0
last_review: 2026-04-18
source: synthesized from PRINCIPLES.md + architecture.md + AUDIT/_SYNTHESIS.md
```

### North Star
**"System does, humans decide."** — RUTA OS automates 80% of hotel sales ops; managers handle only the 20% exceptions that require judgment.

### 3 Pillars

**Pillar 1 — Acquisition** (Lead → Paid Booking)  
Ringostat call → auto-inquiry → manager qualifies → pricing engine → payment portal → LiqPay → Farmer handoff. Target: Lead→Payment under 4 minutes, 5 clicks max.

**Pillar 2 — Retention** (Guest → Rebook)  
Farmer post-stay flow: T+0 wrap-up → T+2/7/14/30/60/180 touchpoints → certificate rewards → rebook conversion. Target: 20% rebook rate.

**Pillar 3 — Intelligence** (Data → Decisions)  
BI dashboards: ADR, RevPAR, occupancy, manager performance, conversion funnel, variance alerts. Director makes decisions from `/dashboard/planning` in 60 seconds.

### Non-Goals
- ❌ Replace Odoo (finance, HR, procurement stay in Odoo)
- ❌ Channel manager / OTA rate sync (external tool)
- ❌ Guest-facing mobile app
- ❌ Multi-language support
- ❌ Email marketing platform (retention comms via Telegram/SMS, not newsletters)

### Constraints
- 1 developer (Claude Code) + 1 product owner (Sergiy/CEO)
- Stack: Next.js + Prisma + tRPC + Better-Auth + Hono + Tailwind (no new infra without ADR)
- Boring tech only (3+ years, 10k+ stars per dependency)
- No SaaS if self-hosted exists in stack

### Success Criteria
| Metric | Current | Q2 Target | Q3 Target |
|---|---|---|---|
| Lead→Payment time | unknown (manual) | < 4 min | < 2 min |
| Conversion rate | 19% | 23% | 30% |
| Rebook rate | unknown | 10% | 20% |
| Manager calls/day tracked | 0% | 100% | 100% |
| Platform uptime | N/A (not in prod) | 99.5% | 99.9% |

### Kill Criteria
If by Q3 2026: conversion rate does not reach 23% OR rebook rate stays below 5% → evaluate whether platform should be rebuilt or replaced with simpler tooling.

---

## 2. ROADMAP

```yaml
vision: §1
horizon_weeks: 8
source: reverse-engineered from WIP + git activity + AUDIT
generated: 2026-04-18
```

### Current Sprint (W1–W2) — Task 9: Farmer Retention
Based on: `AUDIT/_SYNTHESIS.md` GAP-1, `docs/tasks/PROMPT_CHAT_E_FARMER.md`, DB models ready

| Item | Pillar | Size | Status | Depends On | Tasks |
|---|---|---|---|---|---|
| Farmer wrap-up form (post-checkout) | P2 | M | 📋 | LiqPay DONE | task-001 |
| T+0→T+180 task auto-creation cron | P2 | L | 📋 | BullMQ setup | task-002, task-003 |
| Touchpoint tracking (RetentionCampaign) | P2 | M | 📋 | Farmer wrap-up | task-004 |
| `/dashboard/today` Farmer queue | P2 | S | 📋 | Task models DONE | task-005 |

### Next Sprint (W3–W4) — Automation Infrastructure
Based on: `AUDIT/D_automation.md` RISK-1, RISK-2, RISK-3; BullMQ in package.json

| Item | Pillar | Size | Depends On |
|---|---|---|---|
| BullMQ queue setup + EOD cron | P1+P2 | M | Redis (already in stack) |
| Certificate auto-issue on CHECKOUT | P2 | S | BullMQ setup |
| pg LISTEN for inbox SSE | P1 | S | DB access |
| Email polling deduplication | P1 | S | — |

### Sprints 3–4 (W5–W8) — Polish + Meta Channels
- Meta (FB/IG/WA) adapters implementation (Task 5 Phase 2)
- Manager discount approval workflow + DIRECTOR notification
- Prometheus/Sentry metrics + webhook health monitoring
- LiqPay unit tests

### Killed This Audit
None — no STALE items found. All started work is either WIP or clearly PLANNED.

### Decisions Pending
| ID | Decision | Blocking |
|---|---|---|
| PA-001 | BullMQ vs Redis pub/sub for EventEmitter scaling | task-002, task-003 |
| PA-002 | Meta channel priority: FB/IG/WA or skip direct Meta, route via eChat? | task-009 |
| PA-003 | Manager discount approval: Director approve OR auto-block with audit log? | task-010 |

---

## 3. BACKLOG (Tasks)

### task-001
```yaml
id: task-001
title: "Farmer wrap-up form — post-checkout /dashboard/today flow"
status: todo
origin: existing_planned
priority: high
labels: [farmer, retention, ui]
dependencies: []
revenue: 4
impact: 4
effort: 3
risk: 1
score: 4  # (4+4) - (3+1)
roadmap_item: "Farmer wrap-up form (post-checkout)"
pillar: 2
adr: null
evidence: "docs/tasks/PROMPT_CHAT_E_FARMER.md — full spec exists; Activity.type=HANDOFF in src/server/hono/webhooks/liqpay.ts:150+"
```
**Context:** When Farmer is auto-assigned at PREPAYMENT, they need a structured wrap-up form after guest checks out. Form captures: stay quality notes, upsell opportunities, guest feedback, rebook intent. Currently Farmer gets assigned but has zero structured workflow.  
**Acceptance criteria:**
- [ ] Wrap-up form available on `/dashboard/today` after Booking.stage = CHECKOUT
- [ ] Form captures: stay_notes, feedback_score, upsell_captured, rebook_intent
- [ ] Submitting form creates Activity (type=WRAP_UP) + closes CHECKOUT task
- [ ] E2E test: farmer_wrap_up.spec.ts

**Non-goals:** Not a guest-facing form; internal Farmer tool only.  
**Implementation:** Add Task type WRAP_UP, create form component, add tRPC mutation `task.submitWrapUp`.  
**Risks:** None — models already exist.

---

### task-002
```yaml
id: task-002
title: "BullMQ queue + worker infrastructure setup"
status: todo
origin: gap
priority: high
labels: [infrastructure, async, bullmq]
dependencies: []
revenue: 2
impact: 5
effort: 3
risk: 2
score: 2  # (2+5) - (3+2)
roadmap_item: "BullMQ queue setup + EOD cron"
pillar: 1
adr: ADR-001
evidence: "package.json — bullmq@5.74.1 installed but never instantiated; D_automation.md — Total active queues: 0"
```
**Context:** BullMQ is listed in ADR-001 as the chosen queue system and installed as dependency (v5.74.1), but zero queues or workers exist in src/. All automation currently runs synchronously in webhook handlers. This blocks: EOD cron, certificate auto-issue, farmer touchpoint scheduling.  
**Acceptance criteria:**
- [ ] `src/server/queues/` directory with queue definitions
- [ ] Base worker setup with error handling + retry policy
- [ ] Bull Board registered at `/admin/queues` (admin-only)
- [ ] At least one test queue operational
- [ ] Redis connection verified (ioredis in package.json)

**Non-goals:** Not migrating existing synchronous code to queues — only NEW async tasks.  
**Implementation:** Create `src/server/queues/index.ts`, register in instrumentation.ts, add Bull Board.  
**Risks:** Redis must be running (check Coolify config).

---

### task-003
```yaml
id: task-003
title: "EOD cron job + T+2/T+7/T+30 Farmer task auto-creation"
status: todo
origin: existing_planned
priority: high
labels: [farmer, cron, automation, bullmq]
dependencies: [task-002]
revenue: 4
impact: 4
effort: 3
risk: 1
score: 4
roadmap_item: "T+0→T+180 task auto-creation cron"
pillar: 2
adr: null
evidence: "docs/tasks/PROMPT_CHAT_E_FARMER.md — T+2 post-stay call, T+7 review request, T+30 rebook CTA; A_domain.md — EOD status: PLANNED; D_automation.md — Total cron jobs: 1 (IMAP only)"
```
**Context:** Farmer retention requires timed tasks: T+0 wrap-up, T+2 post-stay call, T+7 review request, T+14 retention email, T+30 rebook CTA, T+60 win-back, T+180 archive. None of these are automated. EOD cron also needed for `/dashboard/today` cutoff enforcement.  
**Acceptance criteria:**
- [ ] BullMQ delayed job: on Booking CHECKOUT → schedule T+2 CALL_BACK task
- [ ] EOD cron: daily at 18:00 Kyiv time → summarize day, create next-day tasks
- [ ] Farmer assigned tasks appear in `/dashboard/today` queue
- [ ] CronLog table updated after each run

**Non-goals:** Not sending SMS/emails yet — only creating internal Task records.  
**Implementation:** BullMQ scheduler in `src/server/queues/farmer.ts`, cron via `every: '0 18 * * *'`.  
**Risks:** Timezone handling (Ukraine = UTC+3/UTC+2; use `Europe/Kyiv`).

---

### task-004
```yaml
id: task-004
title: "Certificate auto-issue on CHECKOUT (3rd/5th/birthday)"
status: todo
origin: existing_planned
priority: medium
labels: [loyalty, certificate, automation]
dependencies: [task-002]
revenue: 3
impact: 3
effort: 2
risk: 1
score: 3
roadmap_item: "Certificate auto-issue on CHECKOUT"
pillar: 2
adr: null
evidence: "docs/business-rules.md:70-76 — rules defined; A_domain.md — PLANNED: No CHECKOUT automation visible; Certificate model: prisma/schema/payments.prisma:62"
```
**Context:** Business rules define 3 certificate auto-issue triggers: 3rd stay (₴6,000), 5th stay (₴10,000 + VIP tier), birthday (₴3,000). Certificate model exists and validation in apply-certificate.ts. But no CHECKOUT handler creates these.  
**Acceptance criteria:**
- [ ] On Booking stage → CHECKOUT: increment guest.visitsCount
- [ ] If visitsCount == 3: issue Certificate(amount=6000, expiresAt=T+30)
- [ ] If visitsCount == 5: issue Certificate(amount=10000), set loyaltyTier=VIP
- [ ] Birthday cert: daily cron checks guest.birthDate (month/day match) → issue ₴3,000
- [ ] Activity created for each cert issuance

**Non-goals:** Not sending cert notification yet (Phase 2).  
**Risks:** visitCount must increment atomically (race condition with concurrent checkouts).

---

### task-005
```yaml
id: task-005
title: "/dashboard/today Farmer queue — live cron-driven task list"
status: todo
origin: existing_planned
priority: medium
labels: [ui, farmer, dashboard]
dependencies: [task-003]
revenue: 3
impact: 3
effort: 2
risk: 1
score: 3
roadmap_item: "/dashboard/today Farmer queue"
pillar: 2
adr: null
evidence: "E_docs_and_flows.md — /dashboard/today exists but has no cron-triggered data; wireframes.md — EOD widget wireframe defined"
```
**Context:** `/dashboard/today` page exists and shows EOD Progress widget and Conversion funnel widget. But the Farmer queue (upcoming tasks for today) is not connected to cron-created tasks. Managers see a static placeholder.  
**Acceptance criteria:**
- [ ] Page shows: (1) today's assigned tasks sorted by dueAt, (2) overdue tasks highlighted red, (3) EOD Progress: tasks done / total
- [ ] Wrap-up tasks from task-001 appear here
- [ ] tRPC query: `task.todayQueue` filters by assignedTo=currentUser AND dueAt<=endOfDay
- [ ] Page refreshes via TanStack Query invalidation

**Risks:** None — UI work only.

---

### task-006
```yaml
id: task-006
title: "Complete env.example.txt — add 6 missing integration vars"
status: todo
origin: debt
priority: high
labels: [devops, documentation]
dependencies: []
revenue: 0
impact: 3
effort: 1
risk: 0
score: 2
roadmap_item: null
pillar: 1
adr: null
evidence: "B_integrations.md — Missing from env.example.txt: LIQPAY_PRIVATE_KEY, RINGOSTAT_AUTH_KEY, RINGOSTAT_PROJECT_ID, META_WEBHOOK_VERIFY_TOKEN, TURBOSMS_API_TOKEN, TURBOSMS_SENDER_PHONE"
```
**Context:** 6 critical env vars are referenced in code but missing from env.example.txt. Any new developer or fresh deployment will fail without clear documentation of these vars.  
**Acceptance criteria:**
- [ ] env.example.txt contains all 6 missing vars with placeholder values and comments
- [ ] Each var has a 1-line comment explaining what it's for

**Non-goals:** Not adding actual production values.  
**Implementation:** Edit env.example.txt — 10 minutes.  
**Risks:** None.

---

### task-007
```yaml
id: task-007
title: "LiqPay unit tests — signature verification + idempotency"
status: todo
origin: debt
priority: medium
labels: [testing, liqpay, payments]
dependencies: []
revenue: 0
impact: 3
effort: 2
risk: 1
score: 0
roadmap_item: null
pillar: 1
adr: null
evidence: "B_integrations.md — LiqPay: No tests (unit/integration/e2e); liqpay.ts has SHA1 custom signature logic"
```
**Context:** LiqPay is the primary payment gateway. Its webhook handler has no tests. SHA1 signature verification and idempotency logic are critical — bugs here mean payments not recorded or recorded twice.  
**Acceptance criteria:**
- [ ] `tests/unit/liqpay.test.ts` exists
- [ ] Tests: valid signature accepted, invalid signature rejected
- [ ] Tests: duplicate liqpayOrderId returns already_processed
- [ ] Tests: SaleOrder state transitions (DRAFT→PAID)
- [ ] Tests: Farmer auto-assign on payment

**Risks:** Requires mocking Prisma (vitest).

---

### task-008
```yaml
id: task-008
title: "pg LISTEN for inbox SSE — replace DB polling"
status: todo
origin: debt
priority: low
labels: [performance, sse, database]
dependencies: []
revenue: 0
impact: 2
effort: 2
risk: 2
score: -2
roadmap_item: "pg LISTEN for inbox SSE"
pillar: 1
adr: null
evidence: "D_automation.md:sse/route.ts:72-74 — TODO comment: 'use pg LISTEN in production'; polls DB every 3s per manager; 13 managers = 4+ queries/sec"
```
**Context:** `/api/sse` polls PostgreSQL every 3 seconds to detect new messages. With 13 managers, this creates constant DB load. Should use `pg LISTEN`/`NOTIFY` for true push-based real-time. Code already has a TODO comment acknowledging this.  
**Acceptance criteria:**
- [ ] Replace setInterval polling with pg LISTEN in SSE route
- [ ] Trigger NOTIFY from message insert (Prisma middleware or DB trigger)
- [ ] SSE still reconnects on disconnect

**Risks:** Requires raw pg client (not Prisma) for LISTEN; connection pool management.

---

### task-009
```yaml
id: task-009
title: "Meta channels (FB/IG/WA) — Phase 2 adapter implementation"
status: todo
origin: existing_planned
priority: low
labels: [integration, meta, inbox]
dependencies: []
revenue: 2
impact: 2
effort: 4
risk: 2
score: -2
roadmap_item: "Task 5 Phase 2: Meta Integration"
pillar: 1
adr: null
evidence: "B_integrations.md — Meta stub: verification endpoint only, no event processing; ChannelType enums FACEBOOK/INSTAGRAM/WHATSAPP defined in channels.prisma"
```
**Context:** Meta webhook stub exists (verification only). Adapter not implemented. If guests contact via Instagram DM or WhatsApp Business, messages are silently dropped. Schema is ready (enums defined).  
**Acceptance criteria:**
- [ ] FacebookAdapter, InstagramAdapter, WhatsAppAdapter implement ChannelAdapter interface
- [ ] X-Hub-Signature-256 verification
- [ ] Event processing via processInboundWebhook()
- [ ] Tests: E2E for each adapter

**Non-goals:** Not handling Meta Stories, Reels, or Commerce features.  
**Risks:** Meta API changes frequently; test coverage is critical.

---

### task-010
```yaml
id: task-010
title: "Manager discount approval workflow (>10% → DIRECTOR notification)"
status: todo
origin: debt
priority: medium
labels: [pricing, rbac, ui]
dependencies: []
revenue: 2
impact: 2
effort: 2
risk: 1
score: 1
roadmap_item: null
pillar: 1
adr: null
evidence: "A_domain.md — managerDiscountBlocked flag set in calculate-rate.ts:145-146; approval workflow missing; no notification to DIRECTOR role"
```
**Context:** Pricing engine sets `managerDiscountBlocked=true` when discount >10% but does nothing with this flag. The flag should trigger an approval flow: CLOSER cannot finalize booking without DIRECTOR override.  
**Acceptance criteria:**
- [ ] When `managerDiscountBlocked=true`: disable "Send Payment Link" button with tooltip
- [ ] Show "Request Approval" button → creates Task(type=DISCOUNT_APPROVAL, assignedTo=DIRECTOR)
- [ ] DIRECTOR sees task in `/dashboard/today` → can approve or reject
- [ ] On approve: `booking.discountApprovedBy = directorId`

**Risks:** UX must be fast; approval roundtrip should complete in <2 min.

---

### task-011
```yaml
id: task-011
title: "Update README.md with project description (replace template)"
status: todo
origin: debt
priority: low
labels: [documentation]
dependencies: []
revenue: 0
impact: 1
effort: 1
risk: 0
score: 0
roadmap_item: null
pillar: 1
adr: null
evidence: "E_docs_and_flows.md — README.md: Kiranism starter template boilerplate (STALE); doesn't describe RUTA OS at all"
```
**Context:** README.md contains Next.js starter template copy, not RUTA OS description. Misleading for any new contributor.  
**Acceptance criteria:**
- [ ] README.md: project description, stack summary, local dev setup (link to docs/ops.md), current status
- [ ] Replaces all starter template content

**Risks:** None.

---

### task-012
```yaml
id: task-012
title: "Loyalty tier recalculation on CHECKOUT (visitCount increment + tier upgrade)"
status: todo
origin: gap
priority: medium
labels: [loyalty, automation]
dependencies: [task-004]
revenue: 3
impact: 3
effort: 2
risk: 1
score: 3
roadmap_item: null
pillar: 2
adr: null
evidence: "A_domain.md — VIP tier: LoyaltyTier enum exists + visitsCount field; WIP: 'recalc logic on CHECKOUT not visible'; guest.loyaltyTier must update after each stay"
```
**Context:** GuestProfile has `visitsCount` and `loyaltyTier` fields. Business rules define tier thresholds (NEW→FRIEND at 1, FRIEND→FAMILY at 5, FAMILY→VIP at 10). But no code increments visitsCount on CHECKOUT or recalculates tier. VIP pricing (`calculate-rate.ts:50-56`) reads the tier, so if it's never updated, VIP guests pay wrong prepay %.  
**Acceptance criteria:**
- [ ] On Booking stage → CHECKOUT: `guest.visitsCount++`
- [ ] Recalculate `loyaltyTier` based on new visitsCount
- [ ] If tier changed: create Activity(type=TIER_UPGRADE)
- [ ] Tests: tier transitions (1st, 5th, 10th checkout)

**Risks:** Same as task-004 — atomicity with concurrent checkouts.

---

### task-013
```yaml
id: task-013
title: "AGENTS.md — update auth section from Clerk to Better-Auth"
status: todo
origin: debt
priority: low
labels: [documentation]
dependencies: []
revenue: 0
impact: 1
effort: 1
risk: 0
score: 0
roadmap_item: null
pillar: 1
adr: ADR-003
evidence: "E_docs_and_flows.md — AGENTS.md auth section outdated (Clerk → Better-Auth, not yet updated)"
```
**Context:** AGENTS.md still references Clerk auth setup; project migrated to Better-Auth (ADR-003). New AI agents or developers reading AGENTS.md will try to configure Clerk and fail.  
**Acceptance criteria:**
- [ ] Auth section updated to reference Better-Auth, ADR-003, ops.md setup

---

### task-014
```yaml
id: task-014
title: "No-show prepay enforcement (2+ no-shows → 100% prepay)"
status: todo
origin: existing_planned
priority: medium
labels: [pricing, business-rules]
dependencies: [task-012]
revenue: 2
impact: 2
effort: 2
risk: 1
score: 1
roadmap_item: null
pillar: 1
adr: null
evidence: "A_domain.md — guests.prisma:66 (noshowCount INT); docs/business-rules.md — rules defined; no enforcement code visible"
```
**Context:** GuestProfile has `noshowCount` field. Business rules: 1 no-show → 70% prepay min; 2+ no-shows → 100% prepay. `calculate-rate.ts` handles prepay % by loyaltyTier but ignores noshowCount.  
**Acceptance criteria:**
- [ ] `calculate-rate.ts`: check guest.noshowCount before tier-based prepay %
- [ ] 1 no-show: prepay = max(segment_prepay, 70%)
- [ ] 2+ no-shows: prepay = 100%
- [ ] Tests: no-show prepay override scenarios

---

### task-015
```yaml
id: task-015
title: "Promotion isStackable field + stacking validation"
status: todo
origin: debt
priority: low
labels: [pricing, promotions]
dependencies: []
revenue: 1
impact: 1
effort: 1
risk: 1
score: 0
roadmap_item: null
pillar: 1
adr: null
evidence: "A_domain.md — docs/business-rules.md:48 mentions isStackable=false; Promotion model in rooms.prisma has no isStackable field; WIP status"
```
**Context:** Business rules say promotions should not stack by default. But `isStackable` field is missing from Promotion schema, so find-best-promo.ts cannot enforce this. Currently any two promotions could theoretically stack.  
**Acceptance criteria:**
- [ ] Add `isStackable Boolean @default(false)` to Promotion model
- [ ] Migration: add field
- [ ] `find-best-promo.ts`: when multiple promos match, apply only stackable ones together
- [ ] Tests: stacking validation

**Risks:** Requires Prisma migration + seed update.

---

## 4. ADRs

### Existing ADRs (accepted)

| ID | Title | File | Status | Key Decision |
|---|---|---|---|---|
| ADR-001 | Technology Stack | `docs/adr/ADR-001-stack.md` | ✅ Accepted | Next.js + tRPC + Prisma + Better-Auth + CASL + BullMQ; Tremor Raw copy-paste |
| ADR-002 | No Folio Entity | `docs/adr/ADR-002-no-folio.md` | ✅ Accepted | Settlement computed from charges − payments; no Folio table |
| ADR-003 | Better-Auth over Clerk | `docs/adr/ADR-003-better-auth.md` | ✅ Accepted | Self-hosted, Prisma-native, scrypt (salt:hash format) |

---

### RA-001 — Channel Adapter Pattern (Retrospective)

**Context:** Need to support N communication channels (Telegram, Email, SMS, Viber, Meta) without modifying core inbox logic each time.

**Drivers:** New hotel channels should be added via DB config, not code deployment. Adapter failures should not crash other channels.

**Decision:** Interface-based `ChannelAdapter` with `parseInbound()` and `sendMessage()`. Registry maps ChannelType enum to adapter class. processInboundWebhook() is channel-agnostic.

**Consequences:** (+) Adding Viber = new adapter class + INSERT to Inbox table. (−) Type narrowing required in each adapter's parseInbound().

**Evidence:** `src/server/services/channels/adapter.ts` (interface), `src/server/services/channels/registry.ts` (registry), 5 adapters in `src/server/services/channels/adapters/`

---

### RA-002 — SSE over WebSocket for Real-Time

**Context:** Managers need real-time notifications for incoming calls (screen pop) and new inbox messages.

**Drivers:** HTTP-only infra (Coolify + Hetzner). No ability to open non-HTTP ports. Simple reconnect behavior needed.

**Decision:** Server-Sent Events (SSE) via Next.js API routes. Client uses native EventSource with 5s reconnect.

**Consequences:** (+) HTTP-only, no extra ports, browser auto-reconnect. (−) One-directional (server→client only). Not suitable for chat (Inbox uses SSE for notification + tRPC mutation for send).

**Evidence:** `src/app/api/events/route.ts`, `src/app/api/sse/route.ts`

---

### RA-003 — Role-Based Navigation (Client-Side CASL)

**Context:** 5 roles (ADMIN/DIRECTOR/CLOSER/FARMER/REVENUE_MANAGER) need different nav items.

**Decision:** Client-side nav filtering via CASL ability (same rules as server). Nav config in `src/config/nav-config.ts`; filtered in `src/hooks/use-nav.ts`.

**Consequences:** (+) Instant nav update without server round-trip. (+) CASL rules shared between client and server. (−) Relies on correct session data being loaded before nav renders.

**Evidence:** `docs/nav-rbac.md`, `src/hooks/use-nav.ts`

---

### RA-004 — Payment Link as Stateless Portal Token

**Context:** Guests need to pay without creating an account. Link must be shareable via SMS/WhatsApp.

**Decision:** `Booking.portalToken` (UUID) + `tokenExpiresAt` (72h). `/portal/booking/[token]` is public, no session required.

**Consequences:** (+) No guest account required. (+) Shareable via any channel. (−) Token can be forwarded to third parties (acceptable per business rules — only one payment anyway).

**Evidence:** `prisma/schema/bookings.prisma — portalToken field`, `src/app/portal/booking/[token]/`

---

### RA-005 — Inquiry as Separate Lead Entity

**Context:** Need to distinguish "someone expressed interest" (Inquiry) from "confirmed booking" (Booking).

**Decision:** Inquiry is a separate model with status NEW→IN_PROGRESS→CONVERTED→ARCHIVED. Converting an Inquiry creates a Booking (1:1 link). Inquiry stays alive after Booking is created for pipeline tracking.

**Consequences:** (+) Clean separation of pipeline stages. (+) Unqualified leads tracked separately. (−) Extra model join needed for some queries.

**Evidence:** `prisma/schema/inquiries.prisma:1-132`, `src/server/trpc/routers/inquiry.ts`

---

### RA-006 — Idempotent Webhooks via DB Unique Constraints

**Context:** Ringostat, LiqPay, Telegram all retry webhooks on non-200 responses. Duplicate processing must be prevented.

**Decision:** Each webhook checks for existing record by `externalId` before creating. Returns 200 + `"already_processed"` on duplicate. All webhook handlers always return 200 to prevent retry storms.

**Consequences:** (+) Production-grade dedup. (+) No external dedup service needed. (−) Requires unique index on externalId for every integrated entity.

**Evidence:** `src/server/hono/webhooks/liqpay.ts:75-86`, `src/server/hono/webhooks/ringostat.ts:191-198`

---

### RA-007 — Farmer Auto-Assign via LiqPay Webhook

**Context:** Farmer role must take over from Closer exactly when payment is received.

**Decision:** LiqPay webhook handler auto-assigns first available FARMER user and creates Activity(HANDOFF) atomically inside payment transaction.

**Consequences:** (+) Handoff happens automatically, no manual step. (−) "First available FARMER" is naive — no workload balancing. Future: round-robin or skill-based assign.

**Evidence:** `src/server/hono/webhooks/liqpay.ts:136-151`

---

### RA-008 — BullMQ Declared but Not Instantiated (Pending)

**Context:** ADR-001 selects BullMQ for async jobs. Installed but no queues created.

**Status:** PENDING — must be resolved for task-002.

**Decision needed:** Implement BullMQ queues for Farmer touchpoints + EOD cron, OR choose alternative (Coolify Cron + direct HTTP triggers).

**Options:**
1. BullMQ + Redis (existing dependency) — persistent, retryable, visual Bull Board
2. Coolify cron → HTTP endpoints (simpler, no queue, no retry)
3. pg_cron (Postgres-native scheduling) — no extra infra

**Recommendation:** Option 1 (BullMQ) — already in ADR-001, Redis already in stack for future EventEmitter replacement.

---

### PA-001 — Horizontal Scaling: EventEmitter vs Redis Pub/Sub

**Status:** PENDING  
**Context:** Current EventEmitter is in-process. Screen pops won't work with multiple server instances.  
**Decision needed:** When do we switch to Redis pub/sub for call events? (Current: single server → OK. Scale: multi-server → must migrate)

---

### PA-002 — Meta Channel Priority

**Status:** PENDING  
**Options:** (A) Implement Meta direct API, (B) Route via e-chat which supports WhatsApp, (C) Skip Meta, add Viber/SMS priority first  
**Decision factor:** % of guests using each channel (needs analytics from first 30 days of production use)

---

### PA-003 — Manager Discount Approval Flow Design

**Status:** PENDING  
**Options:** (A) Director manual approval (modal + task), (B) Auto-reject with audit log, (C) Time-limited auto-approve with Director notification  
**Recommendation:** Option A — matches "System does, humans decide" principle; Director must explicitly approve.

---

## 5. CHANGELOG

### [Unreleased]
No unreleased changes at time of audit (2026-04-18).

---

### [0.8.2] — 2026-04-18 — Ringostat Smart Phone: contact sync, click-to-call, SIP status

#### Added
- Contact sync → Ringostat Smart Phone (guest name + link on incoming call)
- Click-to-call from Inquiry card via Ringostat API
- SIP status endpoint `GET /api/calls/sip-status`
- Employee sync `POST /api/calls/sync-employees`
- Outgoing call webhook `?event=outgoing_end`
- Role-based nav filtering (hide Reports/Planning from CLOSER/FARMER)
- Sidebar collapsed state with submenu dropdown on hover
- Call history import script `scripts/import-calls.ts`

#### Schema
- `User` += `phone`, `sipExtension`, `ringostatId`, `department`
- Migration: `20260417_task8b_ringostat_extensions`

---

### [0.8.1] — 2026-04-17 — DevOps: deploy automation

#### Added
- `scripts/deploy.sh` — one command deploy (push → Coolify → healthcheck → screenshot)
- `scripts/prod-seed.sh` + seeder Docker stage
- Chat Completion Checklist in `docs/ops.md`

#### Fixed
- Prod seed passwords (scrypt salt:hash format)

---

### [0.8.0] — 2026-04-17 — Ringostat Webhook + SSE Screen Pop

#### Added
- Ringostat webhook (call_start, call_end, missed)
- SSE `GET /api/events` for real-time manager notifications
- IncomingCallPopup screen pop component

---

### [0.11.0] — 2026-04-17 — Omnichannel Inbox Phase 0+1

#### Added
- Inbox model (multi-tenant channel config)
- Channel adapters: Telegram, Email (IMAP), SMS (TurboSMS), eChat (Viber + TG Personal)
- 3-column inbox UI (conversation list + thread + guest context)
- SSE real-time message updates
- Webhook idempotency (externalId unique constraints)
- IMAP email auto-polling (every 2 min via instrumentation.ts)

---

### [0.10.0] — 2026-04-17 — BI Dashboards

#### Added
- `/dashboard/planning` — KPI cards (Revenue, ADR, RevPAR, Occupancy, ALOS)
- `/dashboard/reports` — Conversion funnel + loss reasons
- `/dashboard/payments` — Payment register (overdue/upcoming/all)
- Role gating: ADMIN/DIRECTOR/REVENUE_MANAGER only

---

### [0.7.x] — 2026-04-17 — Acquisition Flow (Chat A)

#### Added
- Inquiry → Booking → Pricing Engine → Payment Portal full cycle
- 6/6 E2E tests (`acquisition.spec.ts`)
- Farmer auto-assign via LiqPay webhook
- Guest portal `/portal/booking/[token]`

---

### [pre-audit] — Historical (compressed)

- 2026-04-16: Initial project setup (Next.js 16, Prisma multi-file schema, Better-Auth, CASL, docker-compose)
- 2026-04-16: All 39 Prisma models defined + migrated
- 2026-04-16: CASL RBAC (10/10 tests)
- 2026-04-16: CRM Pipeline UI (Kanban with dnd-kit)
- 2026-04-16: Deploy automation infrastructure

---

## 6. APPENDIX: Audit Evidence

### 6.1 Domain Entities Registry

Source: `AUDIT/A_domain.md`

| Entity | File | Status | Tests | Key Fields |
|---|---|---|---|---|
| Guest | `prisma/schema/guests.prisma:36` | DONE | ✅ CASL e2e | guestCode, phone, loyaltyTier, visitsCount |
| Booking | `prisma/schema/bookings.prisma:31` | DONE | ✅ 6/6 e2e | bookingNumber, stage (16 states), closerId, farmerId |
| Inquiry | `prisma/schema/inquiries.prisma:23` | DONE | ✅ Ringostat e2e | status (4 states), source, guestId, bookingId |
| SaleOrder | `prisma/schema/payments.prisma:37` | DONE | ✅ LiqPay test | liqpayOrderId, isPaid, state (4 states) |
| Certificate | `prisma/schema/payments.prisma:62` | DONE | ✅ Pricing test | code, expiresAt, state (4 states), usedAmount |
| Tariff / TariffLine | `prisma/schema/rooms.prisma:47,61` | DONE | ✅ Pricing calc | pricePerNight, weekendSurcharge, minNights |
| Promotion | `prisma/schema/rooms.prisma:87` | DONE | ✅ Find-best-promo | 7 types, 4 date window fields |
| Property | `prisma/schema/rooms.prisma:1` | DONE | ✅ E2E setup | slug (polyana/polianytsia/zatoka/terasa), liqpayKeys |
| User/Manager | `prisma/schema/auth.prisma` | DONE | ✅ CASL 10/10 | role (CLOSER/FARMER/DIRECTOR/ADMIN/REVENUE_MANAGER) |
| Inbox | `prisma/schema/channels.prisma:36` | DONE | ✅ Inbox e2e | channelType (8 types), config (JSON) |
| Conversation | `prisma/schema/channels.prisma:62` | DONE | ✅ Inbox e2e | status (4 states), assignedToId, guestId |
| Message | `prisma/schema/channels.prisma:96` | DONE | ✅ Inbox e2e | direction, externalId (idempotency), attachments |
| PhoneCall | `prisma/schema/calls.prisma` | DONE | ✅ Ringostat e2e | callId, duration, recording, UTM fields |
| KpiPlan/KpiActual | `prisma/schema/planning.prisma` | DONE | ✅ Dashboard | propertyId, metric, month/year, value |
| Task | `prisma/schema/inquiries.prisma:100` | DONE | ✅ Dashboard query | type (CALL_BACK/SEND_PROPOSAL/FOLLOW_UP), dueAt |
| CallGrading | `prisma/schema/calls.prisma` | PLANNED | ❌ | AI grading fields (consumer not implemented) |
| LoyaltyRule | `prisma/schema/loyalty.prisma:1` | DONE | ✅ Implicit | tier, discountPct, certAmount (not seeded fully) |
| ReferralLink | `prisma/schema/loyalty.prisma:25` | DONE | ✅ Implicit | code, token, clicks, conversions |

### 6.2 Integration Contracts

Source: `AUDIT/B_integrations.md`

| Provider | Status | Client | Webhook Route | Auth | Tests |
|---|---|---|---|---|---|
| LiqPay | DONE | `src/server/services/liqpay.ts` | `POST /api/webhooks/liqpay` | SHA1 sig | ❌ |
| Ringostat | DONE | `src/server/ringostat/api.ts` | `POST /api/webhooks/ringostat?event=*` | Auth-Key header | ✅ E2E 17 |
| Telegram | DONE | `adapters/telegram.ts` | `POST /api/webhooks/telegram/:inboxId` | Secret-path | ❌ |
| eChat | DONE | `adapters/echat.ts` | `POST /api/webhooks/echat/:inboxId` | API header | ❌ |
| Email (IMAP) | DONE | `adapters/email.ts + imap-poller.ts` | Polling `/api/cron/poll-email` | IMAP creds | ❌ |
| SMS (TurboSMS) | WIP | `adapters/sms.ts` (outbound only) | ❌ inbound stub | Token auth | ❌ |
| Meta (FB/IG/WA) | PLANNED | ❌ stub | `GET/POST /api/webhooks/meta` (verification only) | X-Hub-Sig-256 | ❌ |
| Servio HMS | NOT FOUND | — | — | — | — |
| HelpCrunch | NOT FOUND | — | — | — | — |

### 6.3 Data Model State

Source: `AUDIT/C_data.md`

- **39 models** in 14 modular .prisma files
- **6 migrations** (2026-04-16 to 2026-04-17)
- **0 orphan models**, **0 missing models**
- **14 seeded** (4 Properties, 15+ RoomCategories, 6 Users, 10 Guests, 20+ Bookings, etc.)
- **1 minor gap**: `PortalPageView.bookingId` lacks FK constraint (low priority)

### 6.4 Automation Inventory

Source: `AUDIT/D_automation.md`

| Type | Count | Status |
|---|---|---|
| Active queues (BullMQ) | 0 | Not instantiated (dep in package.json) |
| Cron jobs | 1 (IMAP poller, 2min) + 1 external (Coolify) | WIP |
| Webhook routes | 6 | 5 ACTIVE + 1 PLANNED (Meta) |
| SSE endpoints | 2 (/api/events + /api/sse) | ACTIVE (sse polls DB, TODO pg LISTEN) |
| EventEmitter events | 3 (INCOMING_CALL, CALL_ENDED, CALL_MISSED) | ACTIVE (in-process only) |
| Feature flags | 2 env vars | ACTIVE |

### 6.5 Docs Index & UX Flows

Source: `AUDIT/E_docs_and_flows.md`

**Fresh docs (active):** architecture.md, business-rules.md, ops.md, ux-principles.md, PRINCIPLES.md, wireframes.md, data-model.md, forms.md, nav-rbac.md, themes.md, CLAUDE.md, CHANGELOG.md

**Archive (historical lineage):** `docs/spec/RUTA_CRM_v2_5_MASTER.md`, `docs/spec/RUTA_CRM_IMPLEMENTATION_v2_7.md` — preserved, not current

**Stale:** `README.md` (template copy), `AGENTS.md` (auth section outdated), `docs/spec/clerk_setup.md` (Clerk → Better-Auth migration complete)

**UI Flows mapped:**
1. Acquisition: Ringostat call → Inquiry → Booking → Payment Portal → Farmer handoff
2. Incoming Call Screen Pop: call_start webhook → SSE → IncomingCallPopup overlay
3. Omnichannel Inbox: Guest message → adapter → processInboundWebhook → SSE → manager reply
4. Farmer Post-Stay (T+0→T+180): PLANNED, design complete
5. BI Director Dashboard: KPIs + funnel + manager performance → `/dashboard/planning`

### 6.6 Stubs & TODO Backlog

Source: `AUDIT/A_domain.md` Stubs section

| File:Line | Type | Description | Task |
|---|---|---|---|
| `src/server/services/pricing/calculate-rate.ts:61-62` | TODO | Meal plan pricing hardcoded to 0 (Phase 2) | task backlog |
| `src/server/services/pricing/calculate-rate.ts:118` | TODO | Services total hardcoded to 0 | task backlog |
| `src/server/services/channels/adapters/sms.ts:13` | NOT IMPL | SMS inbound not implemented | task-009 related |
| `src/server/services/channels/adapters/telegram.ts:94` | NOT IMPL | Telegram signature via secret-path (not standard HMAC) | RA-002 risk |
| `src/app/api/webhooks/meta/route.ts` | NOT IMPL | Meta events not processed | task-009 |
| `src/app/dashboard/page.tsx:4` | TODO | Better-Auth session cookie validation | technical debt |
| `src/proxy.ts:5` | TODO | Validate Better-Auth session for protected routes | technical debt |
| Farmer retention flow | PLANNED | Zero code; full spec in PROMPT_CHAT_E_FARMER.md | task-001..005 |
| EOD cron trigger | PLANNED | Widget wireframe exists; cron job missing | task-003 |
| Certificate auto-issue (CHECKOUT) | PLANNED | Rules in business-rules.md:70-76; no handler | task-004 |
| No-show prepay override | PLANNED | noshowCount field exists; prepay not enforced | task-014 |
| Manager discount approval | WIP | Flag set; approval UI missing | task-010 |
| Promotion isStackable | WIP | Field missing from schema | task-015 |

### 6.7 Gap Matrix

| Claim (in docs/roadmap) | Reality (in code) | Gap Type | Proposed Task |
|---|---|---|---|
| EOD daily summary + cron enforcement | No cron job; /today page has placeholder data | Missing implementation | task-003 |
| Farmer T+0→T+180 retention automation | Farmer assigned, zero automation after | Missing feature | task-001, task-002, task-003 |
| Certificate auto-issue on 3rd/5th/birthday | Certificate model + validation code; no CHECKOUT trigger | Missing trigger | task-004 |
| VIP loyalty tier recalculation | Enum + visitsCount field; no increment on CHECKOUT | Missing automation | task-012 |
| Manager discount approval (>10%) | Flag computed; approval UI/flow missing | Incomplete feature | task-010 |
| All env vars in env.example.txt | 6 production vars missing | Docs gap | task-006 |
| LiqPay tests | No unit or E2E tests for payment critical path | Test gap | task-007 |
| Meta (FB/IG/WA) channels | Stub only; adapters not implemented | Phase 2 feature | task-009 |
| Promotion anti-abuse (isStackable) | Field missing from schema; rule in docs | Schema gap | task-015 |
| No-show prepay enforcement | Field tracks count; pricing rule not applied | Logic gap | task-014 |

