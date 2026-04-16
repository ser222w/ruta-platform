# Changelog

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

