# Architecture — Ruta OS

## Tech Stack (LOCKED — no alternatives without ADR)

| Layer | Choice | Escape hatch |
|---|---|---|
| Runtime | Node.js 22 LTS | — |
| Language | TypeScript strict mode | — |
| Framework | Next.js 16 (App Router, Turbopack dev, standalone output) | TanStack Start v1.0 (Q2-Q3 2027 review) |
| ORM | Prisma 6 (multi-file schema) | Drizzle ~2 weeks |
| Internal API | tRPC v11 | Hono REST ~2 weeks |
| External API / Webhooks | Hono (mounted at `app/api/[[...route]]/route.ts`) | Fastify separate process |
| Auth | Better-Auth v1.5+ | Lucia v3 ~1 week |
| RBAC | CASL (@casl/ability, @casl/prisma) | — |
| Background jobs | BullMQ + Redis 7 | Trigger.dev self-hosted |
| UI kit | shadcn/ui + Tailwind CSS v4 + Radix UI | — |
| Charts | Tremor Raw (copy-paste, NOT @tremor/react npm) | — |
| Tables | TanStack Table v8 | AG-Grid Community |
| Forms | React Hook Form + Zod | TanStack Form |
| Email | Resend + React Email | Postmark ~1 day |
| File storage | Hetzner Object Storage (S3-compatible) | Cloudflare R2 |
| Tests | Vitest (unit) + Playwright (e2e) | — |
| State | Zustand + nuqs (URL params) | — |
| Observability | Sentry + Axiom | — |

### NOT USED (explicit excludes)
- Monorepo/Turborepo, GraphQL, Chatwoot, Supabase, MongoDB, Microservices
- @tremor/react npm (use Tremor Raw copy-paste)
- Metabase (dashboards via Tremor Raw inline)

### Infra
- **Deploy:** Hetzner CX42 (4 vCPU / 8GB) + Coolify ≥4.0.0-beta.451 + Docker
- **DB:** PostgreSQL 16, **Cache:** Redis 7
- **DNS:** Cloudflare → `*.ruta.cam`, **App:** `app.ruta.cam`
- **CI/CD:** GitHub Actions (lint + typecheck + test + build)
- **Backups:** pg_dump → Cloudflare R2, RPO = 1 hour

---

## Project Structure

```
ruta-platform/
├── prisma/
│   ├── schema/             # multi-file Prisma schema (14 domain files)
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/         # login pages
│   │   ├── (dashboard)/    # authenticated routes (layout + sidebar)
│   │   │   ├── crm/        # pipeline kanban + table
│   │   │   ├── today/      # daily queue (EOD Mission)
│   │   │   ├── inquiries/  # lead list + [id] detail
│   │   │   ├── bookings/   # booking management + [id] detail (5 tabs)
│   │   │   ├── inbox/      # omnichannel (Task 5)
│   │   │   ├── calls/      # call logs + CQR (Task 8)
│   │   │   ├── payments/   # payment journal (Task 3)
│   │   │   ├── rooms/      # inventory (Task 2)
│   │   │   ├── guests/     # guest profiles
│   │   │   ├── reports/    # analytics (Task 10)
│   │   │   ├── planning/   # KPI plan-fact (Task 9)
│   │   │   └── settings/   # users, roles, hotels
│   │   ├── portal/booking/[token]/  # PUBLIC guest payment portal
│   │   └── api/
│   │       ├── auth/[...all]/       # Better-Auth handler
│   │       ├── trpc/[trpc]/         # tRPC endpoint
│   │       └── [[...route]]/        # Hono webhooks
│   ├── server/
│   │   ├── auth.ts                  # Better-Auth config
│   │   ├── db.ts                    # Prisma singleton
│   │   ├── trpc/
│   │   │   ├── context.ts           # session + CASL abilities
│   │   │   ├── trpc.ts              # t, publicProcedure, authedProcedure
│   │   │   ├── root.ts              # root AppRouter
│   │   │   └── routers/            # feature routers
│   │   ├── hono/
│   │   │   ├── app.ts
│   │   │   └── webhooks/           # liqpay.ts, ringostat.ts, whatsapp.ts, telegram.ts
│   │   ├── jobs/                   # BullMQ worker + queues
│   │   └── services/               # business logic (no framework imports)
│   │       ├── abilities.ts        # CASL factory per role
│   │       ├── pricing/            # calculate-rate, find-best-promo, apply-cert, gen-schedule
│   │       ├── liqpay.ts, portal.ts, ringostat.ts, whatsapp.ts, telegram.ts, ai.ts
│   ├── components/
│   │   ├── ui/                     # shadcn (npx shadcn add)
│   │   ├── layout/                 # app-sidebar, header, user-nav
│   │   ├── crm/                    # BookingCard, BookingDetailSheet
│   │   └── charts/                 # Tremor Raw wrappers
│   ├── lib/
│   │   ├── trpc-client.ts, validators.ts, constants.ts, utils.ts
│   │   └── hooks/
│   └── emails/                     # React Email templates
├── tests/
│   ├── unit/                       # Vitest: abilities, pricing (37 tests)
│   └── e2e/                        # Playwright: acquisition flow (6 tests)
└── docs/
    ├── architecture.md             # ← this file
    ├── business-rules.md           # pricing, pipeline, loyalty, automation
    ├── ux-principles.md            # P1-P20, D1-D26, terminology
    ├── ops.md                      # deploy, env vars, migrations, local dev
    ├── adr/                        # Architecture Decision Records
    └── tasks/                      # PROMPT_CHAT_A..E task prompts
```

---

## RBAC Roles (CASL)

```typescript
enum Role {
  ADMIN           // CEO/CTO — full access
  DIRECTOR        // Hotel director — full access to their hotel
  CLOSER          // Sales acquisition — leads + own bookings
  FARMER          // Retention — post-checkout upsell + loyalty
  HOUSEKEEPER     // Rooms + checklists only
  REVENUE_MANAGER // Reports, planning, tariffs
}
```

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

## Pipeline Stages (14 stages)

```typescript
enum BookingStage {
  QUALIFY      // seq=10  — new lead
  PROPOSAL_1   // seq=20  — first proposal sent
  REFUSAL_1    // seq=30  — objection
  PROPOSAL_2   // seq=40
  REFUSAL_2    // seq=50
  PROPOSAL_3   // seq=60
  REFUSAL_3    // seq=75
  PROPOSAL_4   // seq=80  — final proposal
  INVOICE      // seq=100 — invoice issued
  PREPAYMENT   // seq=110 — prepay received → AUTO assign Farmer
  DEVELOPMENT  // seq=120 — farmer upsell phase
  CHECKIN      // seq=140 — guest arrived
  CHECKOUT     // seq=150 — isWon=true
  LOST         // terminal — with lostReason
}
```

Auto-rules:
- `QUALIFY → PROPOSAL_1`: call duration > 0 (Ringostat auto)
- `PREPAYMENT`: payment received → auto-assign FARMER
- `CHECKOUT` → `visits_count++`, loyalty tier recalc, new retention lead

---

## Guest Lifecycle

```
Instagram/Phone → Lead (QUALIFY) → Closer (up to 4 proposals)
→ PREPAYMENT → Farmer handoff → DEVELOPMENT → upsell
→ CHECKIN → CHECKOUT
→ AUTO: visits_count++, NEW→FRIEND, retention lead created
→ POST-STAY: NPS request, next task T+2
→ REPEAT: 1+ visits=FRIEND, 5+=FAMILY, 10+=VIP
```

---

## Prisma Schema (14 domain files)

| File | Key Models |
|---|---|
| auth.prisma | User (Role enum), Session, Account, Verification |
| guests.prisma | GuestProfile, LoyaltyTier, PreferredChannel, WishTag |
| bookings.prisma | Booking (14 stages), BookingGuest, UtmTouch |
| payments.prisma | PaymentScheduleLine, SaleOrder, Certificate |
| rooms.prisma | Property, RoomCategory, Tariff, TariffLine, Promotion |
| calls.prisma | PhoneCall, CallTranscription, CallGrading |
| loyalty.prisma | LoyaltyRule, ReferralLink, ReferralUsage |
| activities.prisma | Activity, BookingMessage |
| channels.prisma | Conversation, Message, ChannelQuota |
| inquiries.prisma | Inquiry, Task |
| planning.prisma | KPI, VarLine |
| portal.prisma | CronLog, SystemConfig, PortalPageView |

---

## Code Conventions

- **Comments:** Ukrainian for business logic, English for technical
- **Naming:** camelCase vars, PascalCase types/components, SCREAMING_SNAKE env vars
- **Imports:** absolute from `@/` (maps to `src/`)
- **Files:** kebab-case, one component = one file, default export
- **Error handling:** `TRPCError` for tRPC, `HTTPException` for Hono, never swallow
- **Forms:** `useAppForm` + `useFormFields<T>()` from `@/components/ui/tanstack-form`
- **Icons:** Only from `@/components/icons`, never from `@tabler/icons-react` directly
- **Page headers:** `PageContainer` props (`pageTitle`, `pageDescription`, `pageHeaderAction`)
- **Formatting:** single quotes, JSX single quotes, no trailing comma, 2-space indent
