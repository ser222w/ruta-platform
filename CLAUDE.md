# CLAUDE.md — Ruta OS
# Senior Full-Stack TypeScript Developer context
# Read this BEFORE every session. This is the single source of truth.

## PROJECT IDENTITY

**Ruta OS** — operational platform for RUTA Group hotel network (Ukraine, 4 hotels, ~170 rooms).
Not a CRM — this is the **single source of truth**: sales, operations, omnichannel, telephony, payments, BI, planning.

**Who builds:** CEO Serhiy Korin (product owner + reviewer) + Claude Code (90% of code).
Serhiy writes requirements (what, not how), reviews PRs, makes product decisions, tests UX manually.

**Repository:** `ser222w/ruta-platform`
**Stack decision rationale:** see `../docs/STACK_DECISION.md`
**Task prompts:** see `../docs/PHASE_0_SETUP.md` (TASK 1..N)
**Business principles:** see `../docs/PRINCIPLES.md` — read before every product decision

---

## DECISION FILTER (apply before every feature/field/dependency)

From PRINCIPLES.md — run this checklist:

```
□ Revenue↑ or Cost↓? (P7 Profit-first)
□ Can this process be eliminated entirely? (P1)
□ Can it be automated without UI? (P1, P2)
□ Is there a ready OSS/shadcn solution? (P5)
□ Is this boring tech (3+ years, 10k+ stars)? (D1)
□ Can Claude Code maintain this? (D2)
□ Is there an escape hatch? (D8)
□ Will a new manager understand this screen in 30 seconds? (P6)
□ Is there a test for the critical path? (D5)
□ Is CLAUDE.md updated? (D9)
```

**3+ "no" answers → don't add. Reconsider.**

---

## HOTELS

```typescript
export const HOTELS = [
  { id: 'polyana',    name: 'Рута Резорт Поляна',     rooms: 118, region: 'carpathians' },
  { id: 'polianytsia', name: 'Рута Резорт Поляниця',  rooms: 51,  region: 'carpathians' }, // NEVER confuse with Polyana!
  { id: 'zatoka',     name: 'Сонячна Поляна Затока',  rooms: null, region: 'coast' },       // seasonal
  { id: 'terasa',     name: 'Вілла Тераса',           rooms: null, region: 'misc' },
] as const;
```

---

## TECHNOLOGY STACK (LOCKED — no alternatives without explicit ADR)

### Core
| Layer | Choice | Escape hatch |
|---|---|---|
| Runtime | Node.js 22 LTS | — |
| Language | TypeScript strict mode | — |
| Framework | Next.js 16 (App Router, Turbopack dev, standalone output) | TanStack Start v1.0 (Q2-Q3 2027 review) |
| ORM | Prisma 6 (multi-file schema) | Drizzle ~2 weeks |
| Internal API | tRPC v11 | Hono REST ~2 weeks |
| External API / Webhooks | Hono (mounted in Next.js `app/api/[[...route]]/route.ts`) | Fastify separate process |
| Auth | Better-Auth v1.5+ | Lucia v3 ~1 week |
| RBAC | CASL (@casl/ability, @casl/prisma) | — |
| Background jobs | BullMQ + Redis 7 | Trigger.dev self-hosted |
| UI kit | shadcn/ui + Tailwind CSS v4 + Radix UI | — |
| Charts/BI | Tremor Raw (copy-paste, NOT @tremor/react npm) | — |
| Tables | TanStack Table v8 | AG-Grid Community |
| Forms | React Hook Form + Zod | TanStack Form |
| Email | Resend + React Email | Postmark ~1 day |
| File storage | Hetzner Object Storage (S3-compatible) | Cloudflare R2 |
| Tests | Vitest (unit) + Playwright (e2e) + Zod contract validation | — |
| Observability | Sentry + Axiom | Grafana + Prometheus |
| State | Zustand | — |
| URL params | nuqs | — |

### Infra
- **Deploy:** Hetzner CX42 (4 vCPU / 8GB) + Coolify (≥4.0.0-beta.451, Tailscale-only dashboard) + Docker
- **DB:** PostgreSQL 16 (existing instance on Hetzner)
- **DNS:** Cloudflare → `*.ruta.cam`
- **Backups:** pg_dump → Cloudflare R2, RPO = 1 hour
- **CI/CD:** GitHub Actions (lint + typecheck + test + build)
- **App URL:** `app.ruta.cam`

### NOT USED (explicit excludes)
- ❌ Monorepo / Turborepo — single Next.js app
- ❌ Metabase — all dashboards via Tremor Raw inline
- ❌ GraphQL — tRPC + Hono REST only
- ❌ Chatwoot — build own omnichannel inbox
- ❌ Supabase — self-host everything
- ❌ MongoDB — PostgreSQL only
- ❌ Microservices — single Next.js monolith
- ❌ Odoo abstractions — fresh Prisma schema
- ❌ @tremor/react npm — use Tremor Raw (copy-paste)

---

## PROJECT STRUCTURE

```
ruta-platform/
├── prisma/
│   ├── schema/                     # multi-file Prisma schema
│   │   ├── base.prisma             # generator + datasource
│   │   ├── auth.prisma             # Better-Auth: User (Role enum), Session, Account, Verification
│   │   ├── guests.prisma           # GuestProfile, LoyaltyTier, PreferredChannel
│   │   ├── bookings.prisma         # Booking (BookingStage 14 stages), BookingRoomLine
│   │   ├── payments.prisma         # PaymentScheduleLine, SaleOrder, Certificate
│   │   ├── rooms.prisma            # Property, RoomCategory, Tariff, TariffLine
│   │   ├── calls.prisma            # PhoneCall, CallTranscription, CallGrading
│   │   ├── loyalty.prisma          # LoyaltyRule, ReferralLink, ReferralUsage
│   │   ├── activities.prisma       # Activity, BookingMessage
│   │   └── channels.prisma         # Conversation, Message (omnichannel)
│   ├── migrations/
│   └── seed.ts                     # 4 properties, room categories, tariffs, test users
├── src/
│   ├── app/
│   │   ├── (auth)/                 # login, magic-link pages
│   │   ├── (dashboard)/            # authenticated layout + sidebar
│   │   │   ├── crm/                # leads pipeline, kanban, table view
│   │   │   ├── inbox/              # omnichannel inbox UI
│   │   │   ├── calls/              # call logs, CQR dashboard
│   │   │   ├── bookings/           # booking management
│   │   │   ├── rooms/              # room inventory, availability
│   │   │   ├── payments/           # payment journal, links
│   │   │   ├── guests/             # guest profiles, history
│   │   │   ├── planning/           # KPI plan-fact, variance alerts
│   │   │   ├── reports/            # Tremor dashboards per role
│   │   │   └── settings/           # users, roles, hotels, config
│   │   ├── portal/booking/[token]/ # Guest portal (public, no auth)
│   │   └── api/
│   │       ├── auth/[...all]/      # Better-Auth handler
│   │       ├── trpc/[trpc]/        # tRPC endpoint
│   │       └── [[...route]]/       # Hono catch-all (webhooks)
│   ├── server/
│   │   ├── auth.ts                 # Better-Auth config
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── trpc/
│   │   │   ├── context.ts          # session (Better-Auth) + CASL abilities
│   │   │   ├── trpc.ts             # t instance, publicProcedure, protectedProcedure
│   │   │   ├── root.ts             # root AppRouter
│   │   │   └── routers/            # feature routers (guests, bookings, crm, calls, etc.)
│   │   ├── hono/
│   │   │   ├── app.ts              # Hono app instance
│   │   │   └── webhooks/           # ringostat.ts, liqpay.ts, whatsapp.ts, telegram.ts
│   │   ├── jobs/                   # BullMQ: worker.ts, queues.ts, call-grading.ts, etc.
│   │   └── services/               # business logic (NO framework imports here)
│   │       ├── abilities.ts        # CASL ability factory per role
│   │       ├── liqpay.ts           # LiqPay wrapper
│   │       ├── ringostat.ts        # Ringostat API helpers
│   │       ├── whatsapp.ts         # WhatsApp Cloud API client
│   │       ├── telegram.ts         # Telegraf bot
│   │       └── ai.ts               # Anthropic client for grading/drafts
│   ├── components/
│   │   ├── ui/                     # shadcn components (npx shadcn add)
│   │   ├── charts/                 # Tremor Raw wrappers
│   │   ├── crm/                    # pipeline kanban, lead cards
│   │   ├── inbox/                  # conversation list, message thread
│   │   └── shared/                 # data-table, page layout, etc.
│   ├── lib/
│   │   ├── trpc-client.ts          # tRPC React hooks
│   │   ├── validators.ts           # shared Zod schemas
│   │   ├── constants.ts            # PIPELINE_STAGES, HOTELS, ROLES
│   │   ├── utils.ts                # cn(), formatCurrency(), date helpers
│   │   └── hooks/                  # custom React hooks
│   └── emails/                     # React Email templates
├── tests/
│   ├── unit/                       # Vitest: business logic, CASL, stage transitions
│   └── e2e/                        # Playwright: login → booking → payment → confirmed
├── docs/                           # ADRs + task prompts (read-only for Claude)
├── docker-compose.yml              # PostgreSQL 16 + Redis 7
├── Dockerfile
├── .env.example
└── package.json
```

---

## RBAC ROLES (CASL)

```typescript
enum Role {
  ADMIN           // CEO/CTO — full access to everything
  DIRECTOR        // Hotel director — full access to their hotel
  CLOSER          // Sales acquisition — leads + own bookings
  FARMER          // Sales development — retention + loyalty
  HOUSEKEEPER     // Rooms + checklists only
  REVENUE_MANAGER // Reports, planning, availability, tariffs
}
```

**Role-specific views** (P8 — never "one dashboard for all"):
- **Closer:** guest name, dates, amount, stage → "how to close this deal?"
- **Director:** manager performance, channel mix, variance to plan → "who's performing?"
- **Housekeeper:** room number, checkout date, cleaning status → "what to clean now?"
- **Revenue Manager:** ADR, occupancy, channel mix → "how to optimize yield?"

**Sidebar RBAC:**

| Section | ADMIN | DIRECTOR | CLOSER | FARMER | HOUSEKEEPER | REVENUE |
|---|---|---|---|---|---|---|
| CRM | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Inbox | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Calls | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Bookings | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Rooms | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |
| Payments | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Reports | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Planning | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Settings | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## PIPELINE STAGES (14 stages — from Odoo, validated on real sales flow)

```typescript
export enum BookingStage {
  QUALIFY      = 'QUALIFY',       // seq=10  — new lead
  PROPOSAL_1   = 'PROPOSAL_1',    // seq=20  — first proposal sent
  REFUSAL_1    = 'REFUSAL_1',     // seq=30  — folded, objection
  PROPOSAL_2   = 'PROPOSAL_2',    // seq=40  — second proposal
  REFUSAL_2    = 'REFUSAL_2',     // seq=50  — folded
  PROPOSAL_3   = 'PROPOSAL_3',    // seq=60  — third proposal
  REFUSAL_3    = 'REFUSAL_3',     // seq=75  — folded
  PROPOSAL_4   = 'PROPOSAL_4',    // seq=80  — final proposal
  INVOICE      = 'INVOICE',       // seq=100 — invoice issued
  PREPAYMENT   = 'PREPAYMENT',    // seq=110 — prepay received → AUTO assign Farmer
  DEVELOPMENT  = 'DEVELOPMENT',   // seq=120 — farmer upsell phase
  CHECKIN      = 'CHECKIN',       // seq=140 — guest arrived
  CHECKOUT     = 'CHECKOUT',      // seq=150 — isWon=true
  LOST         = 'LOST',          // terminal — with lostReason
}

// AUTO-RULES:
// QUALIFY → PROPOSAL_1: call duration > 0 sec (Ringostat auto)
// Any REFUSAL_N: manager sets, requires reason
// PREPAYMENT: payment received → auto-assign FARMER role user
// CHECKOUT: guest departed → auto: visits_count++, loyalty tier recalc, new retention lead
```

---

## GUEST LIFECYCLE (simplified from 04_GUEST_LIFECYCLE.md)

```
Instagram/Phone → Lead (QUALIFY) → Closer pipeline (up to 4 proposals)
→ PREPAYMENT → Farmer handoff → DEVELOPMENT → upsell (SPA, transfer, decor)
→ CHECKIN → CHECKOUT
→ AUTO: visits_count++, segment: NEW→FRIEND, retention lead created
→ POST-STAY: auto Telegram/email "feedback + discount"
→ REPEAT VISIT: system knows preferences → faster proposal
→ 5+ visits → FAMILY tier → 10+ → VIP tier
```

---

## QUOTA ARCHITECTURE

Channel × month × hotel × room_type granularity.

Example: `Booking.com × July 2026 × Polyana × Standard = 25% room-nights`

Enforced in: `prisma/schema/channels.prisma` (ChannelQuota model — TODO: add in next migration)

---

## CONVENTIONS

### Code style
- **Comments:** Ukrainian for business logic, English for technical
- **Naming:** camelCase vars, PascalCase types/components, SCREAMING_SNAKE env vars
- **Imports:** absolute from `@/` (maps to `src/`)
- **Files:** kebab-case
- **Components:** one component = one file, default export
- **Error handling:** never swallow; use `TRPCError` for tRPC, `HTTPException` for Hono

### API layer per feature
```
feature/api/types.ts → service.ts → queries.ts
```
Components import from service and queries, never from mock APIs directly.

### Forms
Use `useAppForm` + `useFormFields<T>()` from `@/components/ui/tanstack-form`

### URL params
`nuqs`: `searchParamsCache` on server, `useQueryStates` on client

### Icons
Only import from `@/components/icons`, never from `@tabler/icons-react` directly

### Page headers
Use `PageContainer` props (`pageTitle`, `pageDescription`, `pageHeaderAction`)

### Formatting
Single quotes, JSX single quotes, no trailing comma, 2-space indent

### Git
- Branch: `main` (production) + feature branches
- Commits: conventional (`feat:`, `fix:`, `chore:`, `refactor:`)
- Messages: English. Business logic comments: Ukrainian.

---

## BUSINESS LOGIC RULES (critical, test these)

### Stage transition rules
- Lead becomes Opportunity when: call recorded by Ringostat (duration > 0)
- Unqualified lead: archived, not counted in conversion
- PREPAYMENT → auto-assign Farmer + create "Handoff" activity
- CHECKOUT → auto: `visits_count++`, loyalty tier recalculation, new retention lead, "Get feedback" activity

### Booking number format
`P{YY}{MM}{DD}{NNN}` — e.g., `P260416001` (year=26, month=04, day=16, sequence=001)

### Payment tranches
Default: 30% prepay + 70% balance before checkin. Configurable per booking.

### Loyalty tiers
- NEW: 0 visits
- FRIEND: 1+ visits (auto after first CHECKOUT)
- FAMILY: 5+ visits
- VIP: 10+ visits OR manual assignment

### KeyCRM migration note
Order date = FIRST PAYMENT date (never order creation date)

### Properties
- **Polyana ≠ Polianytsia** — NEVER confuse (different properties, different slug, different data)

---

## TEST SCOPE (D5 — test critical, not everything)

### MUST TEST (Vitest):
- Payment webhook signature verification (LiqPay, WayForPay)
- Pipeline stage transition rules (QUALIFY→PROPOSAL_1, PREPAYMENT→Farmer assign)
- CASL permission checks (Closer ≠ Director scope)
- Booking date validation (overlap, overbooking prevention)
- Booking number generation (format, uniqueness)

### MUST TEST (Playwright):
- login → create booking → generate payment link → payment confirmed → stage = CHECKOUT

### DON'T TEST:
- UI component rendering
- Button colors
- Sidebar toggle

---

## ACCOUNTING

Payments → payment journal in-app (separate from 1C).
Structure: `PaymentJournal` (debit, credit, type, bookingId, guestId, method, currency=UAH).
1C sync: CSV export later (Phase 3).

---

## EXTERNAL INTEGRATIONS

| System | Purpose | Status |
|---|---|---|
| Ringostat | Call tracking → auto lead creation, CQR pipeline | Phase 2 |
| LiqPay | Primary payment | Phase 3 |
| WayForPay | Secondary payment | Phase 3 |
| WhatsApp Cloud API | Omnichannel inbox | Phase 3 |
| Telegraf (Telegram bot) | Omnichannel inbox + manager notifications | Phase 3 |
| Soniox/Gladia | STT transcription for calls | Phase 4 |
| Anthropic Claude | Call grading, AI drafts | Phase 4 |
| Booking.com / Yield Planet | Channel manager | Phase 5 |
| KeyCRM | Migration source (read-only) | Phase 1 |
| Servio HMS | PMS (eventual replacement target) | Future |

---

## ENVIRONMENT VARIABLES

```bash
# Database
DATABASE_URL="postgresql://ruta:ruta_dev_password@localhost:5432/ruta_platform"
REDIS_URL="redis://localhost:6379"

# Auth
BETTER_AUTH_SECRET="change-me-in-production"
BETTER_AUTH_URL="http://localhost:3000"  # prod: https://app.ruta.cam

# Email
RESEND_API_KEY=""

# Payments (Phase 3)
LIQPAY_PUBLIC_KEY=""
LIQPAY_PRIVATE_KEY=""
WAYPAY_MERCHANT_ACCOUNT=""
WAYPAY_MERCHANT_SECRET=""

# Telephony (Phase 2)
RINGOSTAT_API_KEY=""
RINGOSTAT_WEBHOOK_SECRET=""

# Messaging (Phase 3)
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_VERIFY_TOKEN=""
TELEGRAM_BOT_TOKEN=""

# AI (Phase 4)
ANTHROPIC_API_KEY=""

# Storage
HETZNER_S3_ENDPOINT=""
HETZNER_S3_ACCESS_KEY=""
HETZNER_S3_SECRET_KEY=""
HETZNER_S3_BUCKET=""

# Observability
SENTRY_DSN=""
AXIOM_API_KEY=""
AXIOM_DATASET=""
```

---

## CURRENT STATUS

**Phase:** TASK 6 complete + DEPLOY live at app.ruta.cam
**Last commit:** `d87a8b1 fix: remove npm warn text from task6 migration SQL`

**Done:**
- ✅ TASK 1: Foundation — Kiranism starter + Better-Auth + Prisma 6 + tRPC + CASL
- ✅ TASK 2: Prisma schema — 11 domain files (auth, guests, bookings, payments, channels, calls, rooms, planning, accounting, activities, loyalty)
- ✅ TASK 3: CASL RBAC — `defineAbilitiesFor` in tRPC ctx, `authedProcedure`, 10/10 Vitest tests
- ✅ TASK 4: CRM Pipeline UI — kanban + table toggle, drag-to-stage, detail Sheet, audit trail
- ✅ TASK 6: Schema enrichment — GuestSegment/Status enums, WishTag, BookingGuest, UtmTouch, Promotion, CronLog, SystemConfig, PortalPageView + portal.prisma
- ✅ DEPLOY: `https://app.ruta.cam` live, Let's Encrypt SSL, DB: 38 tables, migrated + seeded

**Infrastructure:**
- Server: Hetzner CX33 `ruta-platform-nbg` (178.104.206.63)
- Coolify project UUID: `pgg88ggs4wcgoggsgc8c8ggw`
- App UUID: `dgocwo8kco88so4cs4wwc0sg`
- PostgreSQL UUID: `c0coggc8o8s0c0w8gowcoc00`
- Redis UUID: `e4gos8k44sgwoc88s40s4s0c`
- DNS: `app.ruta.cam → 178.104.206.63` (DNS-only, Traefik SSL)

**Key files (Task 3+4+6):**
- `src/server/db.ts` — Prisma singleton
- `src/server/trpc/context.ts` — CASL ability in every tRPC ctx
- `src/server/trpc/trpc.ts` — `authedProcedure` (session + user + ability)
- `src/server/trpc/routers/crm.ts` — pipeline, list, getById, updateStage, assignManager, addNote
- `src/components/crm/` — BookingCard, BookingDetailSheet, pipeline-constants
- `src/app/dashboard/crm/page.tsx` — kanban + table, drag-to-stage mutation
- `tests/unit/abilities.test.ts` — CASL role tests
- `prisma/schema/guests.prisma` — GuestSegment, GuestStatus, WishTag, GuestProfileTag
- `prisma/schema/bookings.prisma` — BookingGuest, UtmTouch, enriched Booking
- `prisma/schema/rooms.prisma` — Promotion, enriched Property
- `prisma/schema/loyalty.prisma` — enriched LoyaltyRule, ReferralLink, ReferralUsage
- `prisma/schema/payments.prisma` — SaleOrderState, CertificateState enums, @@map tables
- `prisma/schema/portal.prisma` — CronLog, SystemConfig, PortalPageView

**SSH to prod:** `ssh -tt root@178.104.206.63` (uses `~/.ssh/id_ed25519`, requires `-tt` flag)
**Run migration on prod:** temp container on coolify network with `prisma@6 migrate deploy`
**Coolify URL:** `https://cf.ruta.cam` (not coolify.ruta.cam)

**Next (TASK 5 — Omnichannel Inbox):**
- WhatsApp Cloud API webhook + inbound/outbound
- Telegram bot (Telegraf) webhook mode
- Inbox UI: conversation list + message thread + composer
- Real-time: SSE або polling 5s (MVP)
- Auto-match guest by phone/email

---

## PRINCIPLES SUMMARY (from PRINCIPLES.md)

**Product:**
- P1: Eliminate → Automate → Assign to human (in that order)
- P2: System does, humans decide
- P3: One source of truth (no duplicated facts)
- P4: -40% fields vs Odoo (every field needs "who reads this and what decision does it enable?")
- P5: Ready solution > custom build (shadcn npx > copy template > npm > build)
- P6: Improve logic, don't complicate UI (30-second test for new manager)
- P7: Profit-first (every feature answers "how does this affect revenue?")
- P8: Role-based reality (4 different views, not one dashboard for all)

**Dev:**
- D1: Boring tech wins (3+ years, 10k+ stars)
- D2: Claude Code is lead dev, Serhiy is product owner + reviewer
- D3: One prompt = one deliverable
- D4: Simplify ruthlessly (Rule of Three before extracting)
- D5: Test critical only (payment webhooks, CASL, stage transitions)
- D6: Ship daily, improve weekly
- D7: Database = truth, UI = projection (schema first, then UI)
- D8: Escape hatch for every decision (documented migration path)
- D9: Documentation = CLAUDE.md + ADRs + inline comments
- D10: Pareto everywhere (80% value at 20% effort → ship)
