# Changelog

## [Unreleased]

### Added
- TASK-13 (TASK-13)
- `PhoneLink` component — клік по номеру телефону ініціює дзвінок через Ringostat Smart Phone у 8 місцях системи: заявки (список + картка), бронювання (список + картка), платежі, CRM (канбан + деталі), inbox. Замінено plain text та окрему кнопку "Дзвонити".

## [0.8.2] — 2026-04-17 — Ringostat Smart Phone: contact sync, click-to-call, SIP status, outgoing calls

### Added
- **Contact Sync → Ringostat Smart Phone** — при вхідному дзвінку автоматично пушимо ім'я гостя + посилання в Smart Phone (API `minicrm/contacts/sync`)
- **Click-to-Call** — кнопка "Дзвонити" в картці заявки → Server Action `callGuest()` → Ringostat ініціює дзвінок через Smart Phone менеджера (`callback/outward_call`)
- **SIP Status API** `GET /api/calls/sip-status` — перевірка хто з менеджерів онлайн/на лінії (`sipstatus/online` + `sipstatus/speaking`)
- **Employee Sync** `POST /api/calls/sync-employees` — одноразова синхронізація менеджерів Ringostat → RUTA Users (email matching, оновлює phone, sipExtension, ringostatId, department)
- **Outgoing Call Webhook** `?event=outgoing_end` — логування вихідних дзвінків у БД (OUTGOING direction, COMPLETED/ABANDONED status)
- **Callback support** — `call_type=callback` в `call_start` обробляється як incoming
- **Structured logging** — JSON-лог для всіх ringostat подій (service: ringostat, рівні info/warn/error)

### Schema
- `User` += `phone`, `sipExtension`, `ringostatId`, `department`
- Migration: `20260417_task8b_ringostat_extensions`

### Files
- `src/server/ringostat/api.ts` — Ringostat API client (syncContactToSmartPhone, initiateCall, getSipStatus, getProjectEmployees)
- `src/server/ringostat/actions.ts` — Server Actions (callGuest, getManagersSipStatus)
- `src/app/api/calls/sip-status/route.ts`
- `src/app/api/calls/sync-employees/route.ts`

### ENV vars (нові)
```
RINGOSTAT_PROJECT_ID=108065     # Project ID для Smart Phone API
NEXT_PUBLIC_APP_URL=https://app.ruta.cam  # для посилань в Smart Phone
```

### Ringostat UI — 4 webhooks (оновлено)
```
1. POST https://app.ruta.cam/api/webhooks/ringostat?event=call_start   → "Before call" (incoming + callback)
2. POST https://app.ruta.cam/api/webhooks/ringostat?event=call_end     → "After call" (incoming)
3. POST https://app.ruta.cam/api/webhooks/ringostat?event=missed       → "After call" + фільтр Missed
4. POST https://app.ruta.cam/api/webhooks/ringostat?event=outgoing_end → "After outgoing call"
Header: Auth-Key: EXepeznFltwOJTYuKDJvGSnnUBcJEcJC
```

### E2E tests
```
17 tests: 16 passed, 1 skipped (SSE popup — prod-only)
New: callback, outgoing_end, UTM attribution, auth guards, dismiss button
```

### After deploy
```bash
# Sync Ringostat employees to RUTA users:
curl -X POST https://app.ruta.cam/api/calls/sync-employees \
  -H "Cookie: <admin-session>"
```

## [0.8.1] — 2026-04-17 — DevOps: deploy automation + prod seed + chat completion checklist

### Added
- `scripts/deploy.sh` — одна команда `npm run deploy`: push → Coolify trigger → 3хв wait → health check → smoke screenshot
- `scripts/prod-seed.sh` — `npm run db:seed:prod`: запускає seed проти prod DB через seeder Docker stage
- `Dockerfile` — новий `seeder` stage: містить `prisma/` + `tsx` для запуску seed в prod середовищі
- `package.json` — нові скрипти: `deploy`, `db:seed:prod`
- `docs/ops.md` — розділ "Chat Completion Checklist": обов'язковий порядок для кожного чату (typecheck→lint→test→e2e→docs→commit→deploy)
- `docs/tasks/PROMPT_CHAT_*.md` — посилання на Chat Completion Checklist в шапці кожного промпту

### Fixed
- Prod паролі тестових акаунтів — оновлено до коректного scrypt формату (`salt:hash` від `@better-auth/utils/password`)
- Всі 4 акаунти (`admin/closer/farmer/director@ruta.cam`) доступні з паролем `Test1234!`

## [0.8.0] — 2026-04-17 — Chat B: Ringostat Webhook + SSE Screen Pop

### Added
- **Ringostat webhook** `POST /api/webhooks/ringostat?event=call_start|call_end|missed`
  - `call_start` (incoming) → auto-creates PhoneCall + Inquiry, SSE push до менеджера
  - `call_end` → оновлює duration, recording URL, статус PhoneCall + Inquiry
  - `missed` → PhoneCall(MISSED) + Inquiry з nextAction "Передзвонити"
  - Idempotency: дублікати call_id ігноруються
  - Auth: `Auth-Key` header (Ringostat API key)
  - Пошук гостя за телефоном → LTV + кількість заїздів в SSE payload
- **SSE endpoint** `GET /api/events` — real-time нотифікації менеджерів
  - Auth via better-auth session
  - Heartbeat кожні 25 сек
  - Auto-reconnect на клієнті (5 сек)
- **IncomingCallPopup** — screen pop у менеджера при вхідному дзвінку
  - Fixed overlay (top-right), auto-dismiss 30 сек
  - Показує ім'я гостя, телефон, кількість заїздів, LTV, останній готель
  - "Відкрити картку" → `/dashboard/inquiries/[id]`
- **Zustand call store** `src/lib/stores/call-store.ts`
- **useAppEvents hook** `src/lib/hooks/use-app-events.ts` — підключений в dashboard layout
- **AppEventsProvider** — client wrapper для SSE + popup в server layout

### Technical
- `prisma/schema/calls.prisma` — повний rewrite PhoneCall: 20+ полів (callerPhone, calleePhone, status, utmContent, utmTerm, isProper, isRepeated, landingPage тощо)
- Migration: `20260417_task8_ringostat_phonecall`
- `src/server/events.ts` — global EventEmitter singleton
- `src/server/hono/webhooks/ringostat.ts` — Hono webhook handler
- E2E tests: `tests/e2e/ringostat.spec.ts` — 6 тестів

### ENV vars (додати в .env.local)
```
RINGOSTAT_AUTH_KEY=""      # Auth-Key з Ringostat Settings > Integrations > API
RINGOSTAT_PROJECT_ID=""    # Project ID (108065)
```

### Ringostat UI конфігурація (3 webhooks)
```
POST https://app.ruta.cam/api/webhooks/ringostat?event=call_start  → "Before call" incoming
POST https://app.ruta.cam/api/webhooks/ringostat?event=call_end    → "After call" incoming
POST https://app.ruta.cam/api/webhooks/ringostat?event=missed      → "After call" missed
Header: Auth-Key: EXepeznFltwOJTYuKDJvGSnnUBcJEcJC
```

### Verification
- typecheck: 0 errors ✅
- lint: 0 warnings ✅
- curl webhook tests: call_start/duplicate/call_end/missed ✅
- e2e tests: 6/6 ✅

---

## [0.7.4] — 2026-04-17 — Fix: Acquisition Flow bugs

### Fixed
- **Bookings list page** `/dashboard/bookings` — реалізована (була "coming soon"); таблиця з search, pagination, stage badges
- **"Створити замовлення" діалог** — Input для ID готелю замінено на Select з реальними готелями (`trpc.property.list`); дати та готель тепер pre-fill з inquiry
- **"Нове звернення" форма** — додано вибір готелю (необов'язково)

### Added
- `src/server/trpc/routers/property.ts` — новий router: `property.list` (id, name, slug, bookingPrefix)
- `tests/e2e/acquisition_full.spec.ts` — e2e тест повного флоу: inquiry → booking (з вибором готелю) → payment link → portal URL

### Verification
- typecheck: 0 errors ✅
- e2e acquisition: 8/8 ✅ (6 оригінальні + 2 нові)

---

## [0.11.0] — 2026-04-17 — Chat C Phase 0+1: Omnichannel Inbox

### Added
- `/dashboard/inbox` — 3-column UI: conversation list + message thread + guest context panel
- Channel-agnostic `ChannelAdapter` interface + registry pattern for zero-coupling channel ingest/outbound
- Adapters: **Telegram** (grammy, webhook per Inbox), **Email** (nodemailer SMTP + Postmark inbound), **SMS** (TurboSMS REST), **e-chat** (Viber + TG Personal), **Fake** (E2E tests)
- `processInboundWebhook()` pipeline: idempotency (SHA256 event ID) → upsert guest → findOrCreate conversation → create message → pg_notify
- SSE endpoint `/api/sse` → `useInboxSSE()` hook for real-time updates via TanStack Query invalidation
- `/dashboard/settings/inboxes` — admin CRUD UI for inbox management + webhook URL display
- tRPC `inbox` router: 10 procedures (listInboxes, createInbox, listConversations, getConversation, getMessages, sendMessage, assignConversation, resolveConversation, markRead, getCounts)
- E2E tests: `inbox.core.spec.ts` (5 tests, FakeAdapter), `inbox.phase1.spec.ts` (TG round-trip, email threading, SMS outbound)
- Meta stubs: `/api/webhooks/meta` GET+POST return 200 — ready for Phase 2

### Prisma schema changes
- New models: `Inbox`, `WebhookEvent` (idempotency)
- Extended: `Conversation` (+inboxId, +channel, +externalThreadId, +unreadByManager), `Message` (+inboxId, +externalId, +attachments, +sentById), `GuestProfile` (+externalIds Json)
- New enum: `ChannelType` (TELEGRAM, EMAIL, SMS, ECHAT_VIBER, ECHAT_TG_PERSONAL, FACEBOOK, INSTAGRAM, WHATSAPP, UNKNOWN)

### Pending (ops)
- `prisma migrate dev` — schema not yet applied to DB
- Set Telegram webhook: `POST https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://ruta.cam/api/webhooks/telegram/{inboxId}`
- Add `.env.local` credentials: TELEGRAM_DEFAULT_BOT_TOKEN, GMAIL_ADDRESS, GMAIL_APP_PASSWORD, TURBOSMS_API_TOKEN, ECHAT_API_KEY, META_WEBHOOK_VERIFY_TOKEN

---

## [0.10.0] — 2026-04-17 — Chat D: BI Dashboards

### Added
- `/planning`: KPI cards (Revenue, ADR, RevPAR, Occupancy, ALOS) + 12-month revenue trend chart + channel mix donut + manager performance table
- `/reports`: conversion funnel chart (6 months, bar) + loss reasons donut + monthly funnel table with stage conversion rates
- `/payments`: overdue tab (з днями прострочення + кнопка "Нагадати") + upcoming (30 днів) + all payments register with pagination
- `/today`: EOD Progress widget (необроблені звернення + прострочені задачі + progress bar) + conversion funnel widget (поточний місяць)
- Manager performance table (ADMIN/DIRECTOR/REVENUE_MANAGER): звернення, пропозиції, оплати, конверсія, revenue

### Technical
- New: `src/components/charts/` — AreaChart, BarChart, DonutChart, MetricCard (Recharts wrappers, no @tremor/react)
- New: `src/server/trpc/routers/dashboard.ts` — 10 procedures: planningKpis, revenueTrend, channelMix, managerStats, overduePayments, upcomingPayments, allPayments, conversionFunnel, lossReasons, monthlyFunnel, eodProgress
- `src/lib/utils.ts` — додано formatCurrency (UAH), formatPercent, formatNights
- RBAC: /planning restricted to ADMIN/DIRECTOR/REVENUE_MANAGER via tRPC FORBIDDEN
- Payments RBAC: CLOSER/FARMER бачать тільки свої платежі; ADMIN/DIRECTOR — всі

---

## [0.7.3] — 2026-04-17 — Docs: UI reference patterns audit

### Added
- **docs/architecture.md** — нова секція "UI Reference Patterns":
  - Таблиця статусів для 9 директорій `src/features/` (LIVE vs REFERENCE, хто використовує)
  - Таблиця статусів для 7 відповідних `app/dashboard/` маршрутів
  - Reuse map: яку reference брати для Task 5 (Inbox), 8 (Ringostat), 9 (Farmer), 10 (BI),
    Guest CRUD, Rooms CRUD, Create Booking wizard, Quick Inquiry sheet
  - Правило: `src/features/` **не видаляти** — це scaffold для нових фіч

### Context
- Аудит показав що `features/` — це готові UI-шаблони, НЕ legacy мотлох:
  - `users/` та `kanban/` та `notifications/` — **активно використовуються** RUTA сторінками
  - `products/` та `forms/` — повні CRUD scaffolds для копіювання
  - `chat/` — основа для Task 5 (Inbox)
  - `overview/` — основа для Task 10 (BI)

---

## [0.7.2] — 2026-04-17 — Docs: full spec extraction + best practices audit

### Added
- **docs/wireframes.md** — 15 ASCII-екранів з WIREFRAMES spec: Today, Inbox (3-col),
  OrderCard (5 tabs + context panel), Calendar multi-property, Payment Register,
  Proposal page (/p/[token]), Guest Portal ×3 (pre/post/stay), Retention dashboard,
  Wrap-up form, Cancellation dialog, Command Palette (⌘K), EOD widget, Sidebar
- **docs/data-model.md** — advanced entities not in architecture.md:
  GuestRelation, OrderCompanion, Payer (individual + юрособа/ЄДРПОУ/IBAN),
  Touchpoint, RetentionCampaign + CampaignDispatch, AuditLog (Prisma schemas
  + indexes); encryption strategy (AES-256-GCM fields + masking rules);
  birthday automation cron (09:00, 3 templates); Farmer T+0→T+180 full cycle
- **docs/PRINCIPLES.md** — CEO manifesto copied from `/RUTA OS/PRINCIPLES.md`
  into repo: P1-P10 product principles + D1-D10 dev principles з rationale та прикладами

### Updated
- **docs/ux-principles.md** — додано: 26 keyboard shortcuts (global/inbox/order/gmail-style),
  accessibility checklist (WCAG AA, 15 items), success metrics (phase exit criteria +
  30/60/90/180d business targets)
- **CLAUDE.md** — додано посилання на wireframes.md, data-model.md, PRINCIPLES.md

### Unchanged (originals preserved)
- `docs/spec/RUTA_CRM_v2_5_MASTER.md`, `v2_6_ADDENDUM`, `v2_7_ADDENDUM`,
  `RUTA_CRM_IMPLEMENTATION_v2_7.md` — залишились як повні джерела

---

## [0.7.1] — 2026-04-17 — Docs restructure + E2E fixes

### Changed
- **CLAUDE.md** — refactored from 797 → 97 lines; navigation-only with links to focused docs
- **docs/** — reorganized into `architecture.md`, `business-rules.md`, `ops.md`, `ux-principles.md`
- **docs/adr/** — ADR-001 (stack), ADR-002 (no-folio), ADR-003 (better-auth)
- **docs/tasks/** — moved all PROMPT_CHAT_* and PHASE_1 prompts here
- **docs/spec/** — moved all RUTA_CRM_v2_* specs and _DEPLOY_AND_TEST_BLOCK here

### Fixed
- **E2E tests** — auth path `/sign-in` → `/auth/sign-in`, selector fixes, strict mode violations
- **Seed** — password hashing changed from Node.js `crypto.scrypt` to `@better-auth/utils/password`
- **prisma.config.ts** — now loads `.env.local` before `.env` for Prisma CLI commands
- **helpers.ts** — email/password field selectors fixed for Better-Auth UI

### Infra
- **GitHub webhook** added (hook ID: 606776039) → Coolify auto-deploy on `git push`
- **Local dev** documented: `docker compose up -d` + `npm run dev`

### Verification
- unit tests: 37/37 ✅
- e2e tests: 6/6 ✅

---

## [0.7.0] — 2026-04-17 — Chat A: Acquisition Flow

### Added
- **Inquiry creation flow** — ручне та автоматичне звернення, поля: source, status, contactPhone/Name, propertyId, dates, assignedTo
- **Booking creation** — конвертація Inquiry → Booking з генерацією номера `P{YY}{MM}{DD}{NNN}`
- **Pricing engine (3-layer cascade)** — BAR × ночі → promo → cert → prepay по сегменту
  - Split nightly pricing (різна ціна в будні/вихідні)
  - Manager discount з блокером при > 10%
  - Prepay: NEW=50%, FRIEND=30%, FAMILY=30%, VIP=20%
- **PaymentSchedule auto-generation** — prepay + balance до заїзду
- **Guest portal** `/portal/booking/[token]` — публічна mobile-first сторінка з LiqPay формою
- **Portal token** — UUID, expires 72h, зберігається в Booking
- **LiqPay webhook** `POST /api/webhooks/liqpay` — verifies signature, ідемпотентний, auto-assigns Farmer
- **Auto-assign Farmer** при PREPAYMENT stage + Activity: HANDOFF
- `/dashboard/today` — черга дня: нові звернення + задачі + EOD progress
- `/dashboard/inquiries` — список з фільтрами (status, search, pagination)
- `/dashboard/inquiries/[id]` — картка звернення + конвертація в замовлення
- `/dashboard/bookings/[id]` — картка замовлення: 5 вкладок (Запит, Нарахування, Оплати, Задачі, Журнал)
- Sidebar: "Сьогодні" та "Звернення" у Sales групі

### Technical
- New Prisma models: `Inquiry`, `Task` (+ migration `20260417_task7_inquiry_task`)
- New tRPC routers: `inquiry`, `booking`, `task`
- New services: `pricing/calculate-rate.ts`, `pricing/find-best-promo.ts`, `pricing/apply-certificate.ts`, `pricing/generate-schedule.ts`, `portal.ts`, `liqpay.ts`
- New Hono webhook: `src/server/hono/webhooks/liqpay.ts`
- E2E tests: `tests/e2e/acquisition.spec.ts` + `playwright.config.ts`
- Unit tests: `tests/unit/pricing.test.ts` — 27 тестів pricing + LiqPay sig

### Verification
- typecheck: 0 errors ✅
- unit tests: 27/27 ✅
- build: production ✅

## [Unreleased — Task 5: Omnichannel Inbox]

## [0.6.0] — 2026-04-16 — Task 6: Schema Enrichment + Migration Fix

### Task 6 — Prisma Schema Enrichment (Odoo reference)

#### guests.prisma
- Added `GuestSegment` enum: SOLO, COUPLE, FAMILY, GROUP, CORPORATE
- Added `GuestStatus` enum: NO_CONTACT, ACTIVE, CONFIRMED, CHECKED_IN, CHECKED_OUT, COLD, CHURNED, BLACKLISTED
- `GuestProfile` enriched: `guestCode` (unique G-YYYY-NNNNN), `phone2`, `birthDate`, `city`, `country`, `segment`, `currentStatus`, `noshowCount`, `internalNote`, `lastStayDate`, UTM fields
- New model `WishTag` — guest preference tags (allergy, VIP, etc.) → `@@map("wish_tags")`
- New model `GuestProfileTag` — M2M join → `@@map("guest_profile_tags")`

#### bookings.prisma
- `Booking` enriched: `referralLinkId`, `portalToken` (unique), `tokenExpiresAt`, `paymentToken` (unique), `paymentUrl`, `paymentDeadline`, `graceDays`, UTM fields, comms counters, stage timestamps
- New model `BookingGuest` — named guest list per booking → `@@map("booking_guests")`
- New model `UtmTouch` — UTM attribution touchpoints → `@@map("utm_touches")`
- Added 8 indexes on Booking (stage, guestId, propertyId, closerId, checkinDate, paymentStatus, portalToken, paymentToken)

#### rooms.prisma
- `Property` enriched: `bookingPrefix`, `liqpayPublicKey/PrivateKey`, `address`, `phone`, `email`, `website`
- Added `PromotionType` enum: EARLY_BIRD, LAST_MINUTE, LONG_STAY, PACKAGE, SEASONAL, LOYALTY, SPECIAL
- New model `Promotion` — per-property promotions with date windows, discount, prepay override

#### loyalty.prisma
- `LoyaltyRule` enriched: `certAmount`, `referralBonus`, `priority`, `validFrom/Until` → `@@map("loyalty_rules")`
- `ReferralLink` enriched: `token` (unique), `clicks`, `conversions`, relation to Booking → `@@map("referral_links")`
- `ReferralUsage` enriched: `bonusAmount`, `bonusCreditedAt` → `@@map("referral_usages")`

#### payments.prisma
- Added `SaleOrderState` enum: DRAFT, SENT, PAID, CANCELLED
- Added `CertificateState` enum: ACTIVE, USED, EXPIRED, CANCELLED
- `PaymentScheduleLine` enriched: `label`, `pct`, `activityScheduled` flag → `@@map("payment_schedule_lines")`
- `SaleOrder` enriched: `state`, `paidAmount`, `isPaid`, `invoiceNumber`, `rawResponse` → `@@map("sale_orders")`
- `Certificate` enriched: `owner` relation to GuestProfile, `state` enum → `@@map("certificates")`

#### portal.prisma (new file)
- `CronLog` — cron job execution log → `@@map("cron_logs")`
- `SystemConfig` — key/value system configuration → `@@map("system_config")`
- `PortalPageView` — guest portal analytics → `@@map("portal_page_views")`

### Migration fix
- Fixed `20260416203620_task6_schema_enrichment/migration.sql` — removed npm/prisma warn text from lines 1-10 (stdout redirect bug)
- Resolved failed migration via `prisma migrate resolve --rolled-back` on prod
- Applied clean migration via temp container on coolify Docker network
- Prod DB: **38 tables** total

## [0.5.0] — 2026-04-16 — Deploy: app.ruta.cam live

### Infrastructure
- Hetzner CX33 server `ruta-platform-nbg` (178.104.206.63, Nuremberg)
- Coolify self-hosted PaaS on server, Traefik reverse proxy + Let's Encrypt SSL
- PostgreSQL 16 + Redis 7 in Docker on same server (Coolify-managed)
- GitHub repo `ser222w/ruta-platform` (public) — auto-deploy on push to `main`

### Dockerfile fixes (3 iterations to production)
- Removed `--frozen-lockfile` (bun version mismatch in CI)
- Added `openssl` apt install (required by Prisma in node:22-slim)
- Added `prisma generate --schema ./prisma/schema` in dependencies stage
- Set `NEXT_PUBLIC_SENTRY_DISABLED=true` as ENV (was ARG — invisible to process.env)

### Database
- `prisma migrate deploy` — migration `20260416163926_init` applied to prod DB
- `prisma db seed` — 4 properties, 5 room categories, loyalty rules, test users seeded

### DNS
- `app.ruta.cam → 178.104.206.63` (DNS-only, Traefik terminates SSL)
- Let's Encrypt cert issued (CN=app.ruta.cam, issuer R13)
- Wildcard `*.ruta.cam` proxied on old server — specific record overrides

### Test accounts (password: Test1234!)
- `admin@ruta.cam` → ADMIN
- `director@ruta.cam` → DIRECTOR
- `closer@ruta.cam` → CLOSER
- `farmer@ruta.cam` → FARMER

## [0.4.0] — 2026-04-16 — Task 3+4: CASL RBAC + CRM Pipeline UI

### Task 3 — CASL RBAC
- `src/server/db.ts` — Prisma singleton (extracted from auth.ts)
- `src/server/trpc/context.ts` — db user fetch + CASL `ability` in every tRPC context
- `src/server/trpc/trpc.ts` — `authedProcedure` (session + user + ability guaranteed)
- `tests/unit/abilities.test.ts` — 10/10 Vitest tests для всіх ролей
- `vitest.config.ts` + `package.json` — test runner налаштовано

### Task 4 — CRM Pipeline UI
- `src/server/trpc/routers/crm.ts` — 6 procedures: pipeline, list, getById, updateStage, assignManager, addNote
- `src/lib/trpc.ts` — tRPC React client + QueryProvider інтеграція
- `src/components/crm/pipeline-constants.ts` — 8 kanban колонок, STAGE_LABELS, STAGE_BADGE_VARIANT
- `src/components/crm/booking-card.tsx` — drag-and-drop карточка бронювання
- `src/components/crm/booking-detail-sheet.tsx` — Sheet: деталі + таймлайн + нотатки + зміна стадії
- `src/app/dashboard/crm/page.tsx` — kanban + table toggle, drag-to-stage mutation з audit trail

## [0.3.0] — 2026-04-16 — Task 2: Prisma Schema + Foundation
- Modified `seed.ts` (2026-04-16 18:40)
- Modified `accounting.prisma` (2026-04-16 18:38)
- Modified `planning.prisma` (2026-04-16 18:38)
- Modified `channels.prisma` (2026-04-16 18:38)
- Modified `CLAUDE.md` (2026-04-16 18:32)
- Modified `nav-config.ts` (2026-04-16 18:23)
- Modified `middleware.ts` (2026-04-16 18:23)
- Modified `proxy.ts` (2026-04-16 18:23)
- Modified `profile-view-page.tsx` (2026-04-16 18:23)
- Modified `sign-up-view.tsx` (2026-04-16 18:23)
- Modified `page.tsx` (2026-04-16 18:22)
- Modified `sign-in-view.tsx` (2026-04-16 18:22)
- Modified `app-sidebar.tsx` (2026-04-16 18:22)
- Modified `user-nav.tsx` (2026-04-16 18:21)
- Modified `org-switcher.tsx` (2026-04-16 18:21)
- Modified `use-nav.ts` (2026-04-16 18:21)
- Modified `providers.tsx` (2026-04-16 18:21)
- Modified `abilities.ts` (2026-04-16 18:20)
- Modified `app.ts` (2026-04-16 18:17)
- Modified `root.ts` (2026-04-16 18:16)
- Modified `health.ts` (2026-04-16 18:16)
- Modified `trpc.ts` (2026-04-16 18:16)
- Modified `context.ts` (2026-04-16 18:16)
- Modified `route.ts` (2026-04-16 18:16)
- Modified `auth.ts` (2026-04-16 18:16)
- Modified `prisma.config.ts` (2026-04-16 18:15)
- Modified `package.json` (2026-04-16 18:14)
- Modified `activities.prisma` (2026-04-16 18:14)
- Modified `loyalty.prisma` (2026-04-16 18:14)
- Modified `calls.prisma` (2026-04-16 18:14)
- Modified `rooms.prisma` (2026-04-16 18:14)
- Modified `payments.prisma` (2026-04-16 18:14)
- Modified `bookings.prisma` (2026-04-16 18:14)
- Modified `guests.prisma` (2026-04-16 18:13)
- Modified `auth.prisma` (2026-04-16 18:13)
- Modified `base.prisma` (2026-04-16 18:13)

