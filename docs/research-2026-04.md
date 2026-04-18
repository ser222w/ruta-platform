---
title: RUTA Research Consolidation — April 2026
date: 2026-04-18
status: knowledge-base
author: Claude Code (via Sergiy Korin approval)
next_review: 2026-07-01
---

# RUTA Research — April 2026

> Knowledge base для update VISION/ROADMAP. Факти без opinions.

## 1. Business Baseline

### 1.1 Properties
- **Ruta Resort Polyana** — Carpathians flagship, main revenue driver (~118 rooms est.)
- **Ruta Resort Polianytsia/Bukovel** — ~53 rooms, opened Dec 2025 (≠ Polyana — different property!)
- **Sonyachna Polyana** — Zatoka, Black Sea, seasonal
- **Villa Terasa** — boutique property
- Total: ~170 rooms across 4 properties

### 1.2 Baseline KPIs
- Annual occupancy: ~72%
- July room nights: 51% B2B employee organizations
- Direct booking conversion: 19% (target 30%)
- Team: 13+ B2C sales managers + B2B + hotel ops
- CEO: Sergiy Korin (solo, runs everything)

### 1.3 CEO & Governance
- HSMAI Adrian Award winner, SEMBA MIM-Kyiv
- FBN member, Independent Board Director з 2025
- Remote from Barcelona → Andorra relocation у процесі
- Tech budget: $200/mo Claude + ~$240/mo Marketing OS infra

## 2. Tech Stack

### 2.1 Production Systems
| System | URL | Notes |
|---|---|---|
| Odoo 19 CE | ruta.group (DigitalOcean/Debian) | PROD — confirm before change |
| n8n | n8n.ruta.cam | Coolify + PostgreSQL + Redis + worker mode |
| PostgreSQL | Odoo DB | Primary data source |
| Superset | dash.ruta.cam | BI dashboards |
| KeyCRM | — | Sales CRM, migrating to Odoo/Ruta OS |
| Servio HMS | — | PMS + reservations + inventory (replacing via Ruta OS) |
| BAS ERP | — | Accounting (migrate to MASTER/Business Central separately) |
| Ringostat | — | Call tracking → CQR pipeline |
| LiqPay / WayForPay | — | Payments |
| Webflow | rutapolyana.com | Marketing site |
| Cloudflare R2 | — | Media offload rutapolyana.com |
| Telegram bots | — | 3-tier: CEO(Opus)/Sales(Sonnet)/Ops(Haiku) |
| Google Calendar/Drive | — | Productivity — integrate, not replace |

### 2.2 Ruta OS Platform (цей repo)

**Stack:** Next.js App Router + tRPC + Prisma 6 (multi-file) + Better-Auth + CASL + BullMQ + Redis + Tremor Raw

**Completed tasks (backlog --status done):**
- TASK-1: Foundation — Kiranism + Better-Auth + Prisma 6 + tRPC + CASL
- TASK-2: Prisma schema — 11 domain files (14 schema files у prisma/schema/)
- TASK-3: CASL RBAC — abilities.ts + tRPC context + 10/10 Vitest
- TASK-4: CRM Pipeline UI — kanban + detail Sheet + audit trail
- TASK-5: Phase 1 Omnichannel Inbox — TG/Email/SMS/e-chat + UI + SSE
- TASK-7: Schema enrichment — 38 tables
- TASK-8: Chat A — Acquisition Flow (6/6 e2e)
- TASK-9: Ringostat webhook (16/16 e2e)
- TASK-10: Ringostat Smart Phone — contact sync, click-to-call, SIP
- TASK-12: BI Dashboards with Tremor Raw

**In-progress / todo:**
- TASK-6: TASK 5 Phase 2 — Meta inbox (FB/IG/WA) [To Do, HIGH]
- TASK-11: TASK 9 — Farmer Retention T+0→T+180 [To Do, HIGH]

**File structure:**
- `src/features/` — auth, chat, elements, forms, kanban, notifications, overview, products, profile, react-query-demo, users
- `src/app/api/` — auth, calls, cron, events, products, sse, trpc, users, webhooks
- `prisma/schema/` — 14 domain files: accounting, activities, auth, base, bookings, calls, channels, guests, inquiries, loyalty, payments, planning, portal, rooms

### 2.3 Infrastructure
- Coolify: cf.ruta.cam, server ruta-platform-nbg (Hetzner)
- Production URL: app.ruta.cam
- GitHub Actions: `.github/workflows/claude-full-cycle.yml` (tests + deploy + smoke)
- Current version: v0.8.2 (Ringostat Smart Phone)

### 2.4 Scope Boundary (з _temp/05_SYNTHESIS_v2.md)
**Replace via Ruta OS:** KeyCRM, Servio HMS
**Integrate (not replace):** Google Calendar/Drive, Telegram, Ringostat, LiqPay, HiJiffy/Aeve (future)
**Migrate out separately (not in Ruta OS):** BAS ERP → MASTER/Business Central (Ніна + external consultant)

## 3. Planned / In-flight

### 3.1 Next backlog items (confirmed)
- TASK 5 Phase 2: Meta inbox (FB/IG/WA) — поточний W16-W17 sprint
- TASK 9: Farmer Retention T+7/30/180 — поточний W16-W17 sprint (blocker: BullMQ vs pg-boss decision)

### 3.2 Mentioned у docs/conversations
- CQR 3.0 migration: DeepSeek → GPT-4.1-mini (згадано у business context)
- Payment proposal page v2: WayForPay + Apple/Google Pay detection (ROADMAP next sprint)
- Webflow → Next.js migration для rutapolyana.com (ROADMAP backlog depth)
- B2B quota rebalance implementation (ROADMAP next sprint)

### 3.3 Revenue context (з _temp/05_SYNTHESIS_v2.md)
- AI automation: ~20% FTE efficiency gain target
- Rebook rate 0→20% = +~15% revenue per existing FTE (Pillar 3)
- Realistic 12-month target: +30-50% EBITDA/FTE (not x3 yet; 3-5 year horizon)
- Adjacent products: corporate retreats first = +10-20% revenue з 0 FTE add

## 4. Known Gaps (технічні, ruta-platform scope)

### 4.1 Infrastructure
- **Docker healthcheck не налаштований** — Coolify status = "Running (unknown)" замість "Running (healthy)"
  - Workaround у `scripts/wait-deploy.sh`: accept "running:unknown"
  - Потребує реального `/api/health` endpoint + Dockerfile HEALTHCHECK директива
- **No `[Unreleased]` section у CHANGELOG.md** — поточний формат починається з versioned entries
  - `scripts/update-docs.sh` шукає `## [Unreleased]` але не знаходить → нові entries не додаються

### 4.2 CI/CD
- **pre-merge CI: bun test підхоплює Playwright specs** — `vitest run` + Playwright в одній команді потенційно
  - `package.json` "test" script: `vitest run` — це unit only, але E2E запускається окремо у `run-tests.sh`
  - `.github/workflows/claude-full-cycle.yml` — треба перевірити чи не дублює E2E у unit phase
- **`cycle.sh` вимагає TASK_ID** — для docs-only cycles треба meta-task

### 4.3 Architectural decisions pending (не формалізовані як ADR)
- **BullMQ vs pg-boss** для Farmer queues — ADR-001-stack.md вже обрав BullMQ, але ROADMAP.md каже "ADR для BullMQ vs pg-boss" (протиріччя — рішення фактично прийнято)
- **Payload CMS vs Sanity** для Webflow міграції — справді відкрите питання
- **Feature flags** підхід: env vars vs Unleash — не згадано в ADR

### 4.4 Code coverage
- Prisma schema: 14 files, 38 tables — coverage тестами невідома (TASK-2/3 покривають RBAC)
- `src/features/` має 11 subfolders, але тільки окремі мають e2e (ringostat = 16 e2e, acquisition = 6 e2e)

## 5. Architectural Decisions (existing ADRs)

### 5.1 Accepted ADRs
| ID | Decision | Key point |
|---|---|---|
| ADR-000 | ADR Process | MADR 3.0, sequential numbering, immutable after accepted |
| ADR-001 | Tech Stack | Next.js + tRPC + Prisma 6 + Better-Auth + CASL + BullMQ (already decided) |
| ADR-002 | No Folio entity | Settlement = computed, not stored; linked to Booking.id |
| ADR-003 | Better-Auth over Clerk/NextAuth | Self-hosted, scrypt hashing via @noble/hashes |

### 5.2 Tooling введено April 2026
- Three-tier planning: VISION → ROADMAP → backlog + ADR
- backlog.md CLI як source of truth для tasks
- Superpowers для orchestrator workflow
- `scripts/cycle.sh` — master automated cycle (pre-pr + post-merge)
- Coolify API polling у `scripts/wait-deploy.sh` (no sleep 60)
- L1+ autonomy workflow (2 checkpoints per task)

### 5.3 Decisions фактично прийняті (але не формалізовані як ADR)
- **BullMQ обрано** (ADR-001-stack.md: "BullMQ + Redis (not Trigger.dev or cron jobs)") — ROADMAP.md помилково каже "ADR pending"
- **Multi-file Prisma schema** (ADR-001) — вже реалізовано в 14 файлах

## 6. Open Questions (треба вирішити у найближчі 2-4 тижні)

- [ ] TASK 5 Phase 2 (Meta) vs TASK 9 (Farmer) — який запустити першим? (W16-W17 оба заплановані, але XL = 1 людина в 1 час)
- [ ] Docker healthcheck — реальний `/api/health` з DB ping, чи lightweight process-only check?
- [ ] Webflow migration timeline — пов'язано з Next.js + Payload/Sanity decision. Коли?
- [ ] CQR 3.0 migration timeline — чи є blockers? DeepSeek → GPT-4.1-mini скільки effort?
- [ ] Payment proposal page — що є scope Phase 1 (поточний) vs Phase 2?
- [ ] CHANGELOG.md [Unreleased] section — треба додати вручну щоб `update-docs.sh` працював
- [ ] `claude-full-cycle.yml` — перевірити чи E2E не дублюється у unit test phase
