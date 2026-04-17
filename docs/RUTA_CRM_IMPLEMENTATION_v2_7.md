# RUTA CRM — Implementation Specification v2.7
## Повна технічна документація для Claude Code

**Дата:** 17 квітня 2026  
**Базується на:** v2.5 MASTER + v2.5 WIREFRAMES + v2.6 ADDENDUM + v2.7 ADDENDUM  
**Стек:** Next.js 16 App Router + TypeScript strict + Kiranism + Shadcn + Prisma + PostgreSQL + Clerk + Claude API

---

# ЧАСТИНА 1 — Структура проекту

```
ruta-crm/
├── .env.example
├── .env.local                    # gitignored
├── CLAUDE.md                      # main Claude Code config
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── prisma/
│   ├── schema.prisma             # всі 20+ моделей
│   ├── migrations/
│   ├── seed.ts
│   └── seed-data/                # JSON seeds (готелі, номери, тарифи)
│
├── src/
│   ├── app/
│   │   ├── (auth)/               # Clerk routes
│   │   │   └── (signin)/page.tsx
│   │   │
│   │   ├── (dashboard)/          # protected
│   │   │   ├── layout.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── today/page.tsx
│   │   │   ├── chats/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── guests/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── retention/
│   │   │   │   ├── page.tsx
│   │   │   │   └── campaigns/page.tsx
│   │   │   ├── certificates/page.tsx
│   │   │   ├── payments/           # Реєстр платежів (accounting)
│   │   │   │   └── page.tsx
│   │   │   ├── campaigns/page.tsx
│   │   │   ├── rates/
│   │   │   │   ├── tariffs/page.tsx
│   │   │   │   └── promos/page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── conversion/page.tsx
│   │   │   │   ├── ltv/page.tsx
│   │   │   │   ├── attribution/page.tsx
│   │   │   │   └── financial/page.tsx
│   │   │   └── settings/
│   │   │       ├── team/page.tsx
│   │   │       ├── properties/page.tsx
│   │   │       └── integrations/page.tsx
│   │   │
│   │   ├── p/[token]/             # public proposal
│   │   │   ├── page.tsx
│   │   │   ├── pay/page.tsx
│   │   │   └── success/page.tsx
│   │   │
│   │   ├── g/[token]/             # public guest portal
│   │   │   ├── page.tsx
│   │   │   ├── arrival/page.tsx
│   │   │   ├── stay/page.tsx
│   │   │   └── review/page.tsx
│   │   │
│   │   └── api/
│   │       ├── webhooks/
│   │       │   ├── telegram/route.ts
│   │       │   ├── helpcrunch/route.ts
│   │       │   ├── instagram/route.ts
│   │       │   ├── ringostat/route.ts
│   │       │   ├── wayforpay/route.ts
│   │       │   ├── liqpay/route.ts
│   │       │   └── servio/route.ts
│   │       ├── ai/
│   │       │   ├── reply-suggest/route.ts
│   │       │   ├── qualify/route.ts
│   │       │   └── summary/route.ts
│   │       └── cron/
│   │           ├── birthday-check/route.ts
│   │           ├── retention-trigger/route.ts
│   │           ├── overdue-escalation/route.ts
│   │           ├── ai-guest-summary/route.ts
│   │           └── documents-purge/route.ts
│   │
│   ├── components/
│   │   ├── ui/                    # Shadcn primitives (з Kiranism)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── command-palette.tsx
│   │   │   └── role-based-nav.tsx    # меню per role
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── ai-composer.tsx
│   │       ├── context-sync-panel.tsx    # критичний
│   │       ├── next-action-banner.tsx
│   │       ├── wrap-up-form.tsx
│   │       ├── eod-progress.tsx
│   │       └── sensitive-field.tsx       # masked display
│   │
│   ├── features/
│   │   ├── inquiries/
│   │   │   ├── components/
│   │   │   ├── actions/
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   ├── orders/
│   │   │   ├── components/
│   │   │   ├── actions/
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   ├── guests/
│   │   │   ├── components/
│   │   │   │   ├── guest-360.tsx
│   │   │   │   ├── companion-manager.tsx
│   │   │   │   └── payer-selector.tsx
│   │   │   ├── actions/
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   ├── payments/
│   │   │   ├── components/
│   │   │   ├── actions/
│   │   │   └── pricing/             # PRICING ENGINE
│   │   │       ├── calculate-rate.ts
│   │   │       ├── find-best-promo.ts
│   │   │       ├── apply-certificate.ts
│   │   │       └── generate-schedule.ts
│   │   ├── calendar/
│   │   ├── retention/
│   │   │   ├── actions/
│   │   │   │   ├── winback-trigger.ts
│   │   │   │   ├── birthday-greet.ts
│   │   │   │   └── anniversary.ts
│   │   ├── marketing/
│   │   │   ├── attribution/
│   │   │   │   ├── touchpoint-log.ts
│   │   │   │   ├── meta-ads-sync.ts
│   │   │   │   └── google-ads-sync.ts
│   │   ├── proposal/                 # guest-facing
│   │   └── ai/
│   │       ├── actions/
│   │       │   ├── claude-client.ts
│   │       │   ├── qualify.ts
│   │       │   ├── summarize.ts
│   │       │   └── suggest-reply.ts
│   │       ├── prompts/
│   │       └── utils/
│   │
│   ├── lib/
│   │   ├── prisma.ts               # singleton
│   │   ├── auth.ts                 # Clerk helpers + RBAC
│   │   ├── encryption.ts           # field-level encryption
│   │   ├── telegram.ts
│   │   ├── wayforpay.ts
│   │   ├── liqpay.ts
│   │   ├── ringostat.ts
│   │   ├── helpcrunch.ts
│   │   ├── meta-api.ts
│   │   ├── google-ads-api.ts
│   │   ├── i18n/
│   │   │   └── uk.ts               # усі UI-тексти
│   │   └── utils/
│   │
│   ├── hooks/
│   │   ├── use-shortcut.ts
│   │   ├── use-role.ts
│   │   └── use-permissions.ts
│   │
│   ├── stores/
│   │   └── command-palette.store.ts
│   │
│   └── types/
│       ├── database.ts
│       └── index.ts
```

---

# ЧАСТИНА 2 — Prisma Schema (Full)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════
// USERS & AUTH (Clerk-managed on external side)
// ═══════════════════════════════════════════

model User {
  id                String   @id                // Clerk user ID
  email             String   @unique
  firstName         String?
  lastName          String?
  role              UserRole @default(ACQUISITION)
  assignedProperties String[] @default([])      // property IDs

  // relations
  assignedInquiries Inquiry[]  @relation("inquiryAssignee")
  assignedOrders    Order[]    @relation("orderAssignee")
  previousOrders    Order[]    @relation("orderPreviousAssignee")
  createdCharges    Charge[]
  tasks             Task[]
  auditLogs         AuditLog[]
  aiUsage           AIUsage[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([role])
}

enum UserRole {
  ADMIN
  CEO
  HOTEL_MANAGER
  SALES_HEAD
  ACQUISITION
  FARMER
  MARKETER
  RECEPTIONIST
  REVENUE_MANAGER
  ACCOUNTANT
}

// ═══════════════════════════════════════════
// PROPERTIES & INVENTORY
// ═══════════════════════════════════════════

model Property {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  address     String?
  description String?
  photos      Json?
  amenities   Json?
  
  rooms       Room[]
  tariffs     Tariff[]
  promos      Promo[]
  orders      Order[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Room {
  id          String   @id @default(cuid())
  propertyId  String
  property    Property @relation(fields: [propertyId], references: [id])
  
  number      String
  type        RoomType
  capacity    Int
  amenities   Json?
  photos      Json?
  
  orders      Order[]

  @@unique([propertyId, number])
  @@index([type])
}

enum RoomType {
  STANDARD
  FAMILY
  DELUXE
  SUITE
  PRESIDENTIAL
}

model Tariff {
  id             String   @id @default(cuid())
  propertyId     String
  property       Property @relation(fields: [propertyId], references: [id])
  
  name           String
  roomType       RoomType
  pricePerNight  Decimal
  currency       String   @default("UAH")
  mealPlan       MealPlan @default(NONE)
  
  validFrom      DateTime
  validTo        DateTime
  minNights      Int      @default(1)
  minGuests      Int      @default(1)
  maxGuests      Int      @default(4)
  
  prepayRule     Json     // {NEW: 50, FRIEND: 30, FAMILY: 30, VIP: 20}
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([propertyId, validFrom, validTo])
  @@index([roomType])
}

enum MealPlan {
  NONE
  BREAKFAST
  HALF_BOARD
  FULL_BOARD
  ALL_INCLUSIVE
}

model Promo {
  id                String   @id @default(cuid())
  name              String
  propertyId        String
  property          Property @relation(fields: [propertyId], references: [id])
  
  roomTypes         RoomType[]
  
  discountPct       Decimal?
  priceOverride     Decimal?
  
  minNights         Int?
  minGuests         Int?
  maxGuests         Int?
  channelsAllowed   String[]  // ['telegram', 'direct', 'website']
  advanceDays       Int?
  guestSegments     GuestSegment[]
  
  priority          Int       @default(0)
  isStackable       Boolean   @default(false)
  
  bookableFrom      DateTime
  bookableTo        DateTime
  stayableFrom      DateTime
  stayableTo        DateTime
  blackoutDates     DateTime[] @default([])
  
  isActive          Boolean   @default(true)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([propertyId, isActive])
  @@index([stayableFrom, stayableTo])
}

// ═══════════════════════════════════════════
// GUEST (з повним tracking)
// ═══════════════════════════════════════════

model Guest {
  id                       String   @id @default(cuid())
  
  // Базова ідентифікація
  firstName                String
  lastName                 String?
  email                    String?  @unique
  phone                    String?  @unique
  language                 String   @default("uk")
  
  // Дата народження + адреса
  birthDate                DateTime?
  addressCountry           String?  @default("UA")
  addressRegion            String?
  addressCity              String?
  addressStreet            String?  // ENCRYPTED at rest
  addressPostalCode        String?
  
  // Документ особи (SENSITIVE — encryption via Prisma middleware)
  documentType             DocumentType?
  documentNumber           String?  // ENCRYPTED
  documentIssuedBy         String?  // ENCRYPTED
  documentIssuedAt         DateTime?
  documentExpiresAt        DateTime?
  
  // Родинний стан
  maritalStatus            MaritalStatus?
  
  // Месенджери
  telegramUserId           String?  @unique
  telegramUsername         String?
  telegramChatId           String?
  telegramBotStartParam    String?
  
  instagramUserId          String?  @unique
  instagramUsername        String?
  instagramThreadId        String?
  
  facebookPsid             String?  @unique
  whatsappPhoneId          String?
  viberId                  String?
  
  // UTM first touch (never overwrite)
  firstUtmSource           String?
  firstUtmMedium           String?
  firstUtmCampaign         String?
  firstUtmContent          String?
  firstUtmTerm             String?
  firstTouchpointAt        DateTime?
  firstTouchpointChannel   String?
  firstLandingPage         String?
  firstReferrer            String?
  
  // UTM last touch (update each)
  lastUtmSource            String?
  lastUtmMedium            String?
  lastUtmCampaign          String?
  lastUtmContent           String?
  lastUtmTerm              String?
  lastTouchpointAt         DateTime?
  lastTouchpointChannel    String?
  
  // Google tracking
  gaClientId               String?
  gclid                    String?
  dclid                    String?
  wbraid                   String?
  gbraid                   String?
  
  // Meta tracking
  fbclid                   String?
  fbp                      String?
  fbc                      String?
  metaAdAccountId          String?
  metaCampaignId           String?
  metaAdSetId              String?
  metaAdId                 String?
  metaPlacement            String?
  
  // Other paid traffic
  tiktokClickId            String?
  instagramMediaId         String?
  
  // Ringostat
  ringostatFirstCallId     String?
  ringostatCallSource      String?
  ringostatCampaign        String?
  
  // Website context
  firstSessionId           String?
  firstUserAgent           String?
  firstDeviceType          String?
  firstBrowser             String?
  firstOs                  String?
  firstGeoCity             String?
  firstGeoCountry          String?
  firstIpHash              String?     // HASHED per GDPR
  
  sessionCount             Int         @default(0)
  pagesViewedTotal         Int         @default(0)
  totalTimeOnSiteMs        BigInt      @default(0)
  
  // Attribution + cost
  acquisitionCostEstimated Decimal?
  attributionModel         String      @default("first-touch")
  
  // Consent (GDPR)
  consentMarketingOptIn    Boolean     @default(false)
  consentTransactionalOnly Boolean     @default(true)
  consentGivenAt           DateTime?
  consentSource            String?
  consentChannels          String[]    @default([])
  gdprDeletionRequested    Boolean     @default(false)
  gdprDeletionDate         DateTime?
  
  // Guest lifecycle
  segment                  GuestSegment @default(NEW)
  visitsCount              Int          @default(0)
  totalSpent               Decimal      @default(0)
  ltv                      Decimal      @default(0)
  lastStayDate             DateTime?
  lastStaySeason           String?
  loyaltyTier              String       @default("bronze")
  rfmScore                 String?
  
  // Preferences (JSON)
  preferences              Json?
  dietaryNotes             String?
  
  // AI enrichment
  aiSummary                String?      // updated daily by cron
  aiSummaryUpdatedAt       DateTime?
  
  // Portal
  portalToken              String       @unique @default(cuid())

  // Relations
  inquiries                Inquiry[]
  orders                   Order[]
  certificates             Certificate[]
  touchpoints              Touchpoint[]
  guestRelations           GuestRelation[] @relation("guestMain")
  relatedByOthers          GuestRelation[] @relation("guestRelated")
  orderCompanions          OrderCompanion[]

  createdAt                DateTime     @default(now())
  updatedAt                DateTime     @updatedAt
  
  @@index([email])
  @@index([phone])
  @@index([segment, lastStayDate])
  @@index([birthDate])                  // для ДН cron
  @@index([telegramUserId])
  @@index([instagramUserId])
}

enum GuestSegment {
  NEW
  FRIEND
  FAMILY
  VIP
}

enum DocumentType {
  PASSPORT_UA
  ID_CARD
  FOREIGN_PASSPORT
  BIRTH_CERTIFICATE
}

enum MaritalStatus {
  SINGLE
  MARRIED
  PARTNERED
  UNKNOWN
}

// ═══════════════════════════════════════════
// GUEST RELATIONSHIPS
// ═══════════════════════════════════════════

model GuestRelation {
  id                String   @id @default(cuid())
  
  guestId           String
  guest             Guest @relation("guestMain", fields: [guestId], references: [id])
  
  relatedGuestId    String
  relatedGuest      Guest @relation("guestRelated", fields: [relatedGuestId], references: [id])
  
  relationType      RelationType
  relationNote      String?
  
  anniversaryDate   DateTime?   // для подружжя — дата весілля
  
  source            RelationSource @default(MANUAL_INPUT)
  isConfirmed       Boolean     @default(false)
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@unique([guestId, relatedGuestId, relationType])
  @@index([guestId])
  @@index([relatedGuestId])
  @@index([anniversaryDate])
}

enum RelationType {
  SPOUSE
  PARTNER
  CHILD
  PARENT
  SIBLING
  FRIEND
  COLLEAGUE
  OTHER
}

enum RelationSource {
  MANUAL_INPUT
  CHECK_IN_REGISTRATION
  INFERRED_FROM_BOOKINGS
  GUEST_PORTAL_SELF
}

// ═══════════════════════════════════════════
// INQUIRY (Звернення)
// ═══════════════════════════════════════════

model Inquiry {
  id                    String @id @default(cuid())
  
  guestId               String?
  guest                 Guest? @relation(fields: [guestId], references: [id])
  
  source                InquirySource
  sourceChannel         String?
  
  status                InquiryStatus @default(NEW)
  unqualifiedReason     UnqualifiedReason?
  unqualifiedNote       String?
  
  assignedToId          String?
  assignedTo            User? @relation("inquiryAssignee", fields: [assignedToId], references: [id])
  
  nextAction            String?
  firstResponseAt       DateTime?
  responseTimeMs        Int?
  
  convertedToOrderId    String? @unique
  convertedToOrder      Order?  @relation(fields: [convertedToOrderId], references: [id])
  
  aiQualified           Boolean @default(false)
  aiExtracted           Json?
  
  messages              Message[]
  touchpoints           Touchpoint[]
  tasks                 Task[]
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([status, assignedToId])
  @@index([createdAt])
  @@index([source])
}

enum InquirySource {
  TELEGRAM
  INSTAGRAM
  HELPCRUNCH
  WHATSAPP
  FACEBOOK_MESSENGER
  PHONE
  WEBSITE_FORM
  EMAIL
  WALK_IN
  OTHER
}

enum InquiryStatus {
  NEW
  WARMING
  UNQUALIFIED
  CONVERTED
  ARCHIVED
}

enum UnqualifiedReason {
  WRONG_TARGET_AUDIENCE
  SPAM_OR_BOT
  MANAGER_ERROR
  TEST_MESSAGE
  DUPLICATE_CONTACT
  OUT_OF_SERVICE_AREA
  INCOMPATIBLE_DATES
  OTHER
}

// ═══════════════════════════════════════════
// ORDER (Замовлення) — core
// ═══════════════════════════════════════════

model Order {
  id                    String @id @default(cuid())
  orderNumber           String @unique          // ORD-YYYY-NNNNN
  
  inquiryId             String? @unique
  inquiry               Inquiry?
  
  guestId               String
  guest                 Guest @relation(fields: [guestId], references: [id])
  
  propertyId            String
  property              Property @relation(fields: [propertyId], references: [id])
  
  roomId                String?
  room                  Room? @relation(fields: [roomId], references: [id])
  
  tariffId              String?
  tariff                Tariff? @relation(fields: [tariffId], references: [id])
  
  stage                 OrderStage @default(QUALIFY)
  
  // Stage change reasons
  lostReason            LostReason?
  lostNote              String?
  cancelReason          CancelReason?
  cancelNote            String?
  cancelType            CancelType?   // REFUND or CREDIT_BALANCE
  
  // Dates
  checkIn               DateTime?
  checkOut              DateTime?
  actualCheckInAt       DateTime?
  actualCheckOutAt      DateTime?
  
  // Guests
  adults                Int  @default(2)
  children              Int  @default(0)
  infants               Int  @default(0)
  
  // Source tracking
  source                InquirySource
  sourceChannel         String?
  
  // Pricing (computed values cached for performance)
  accommodationTotal    Decimal  @default(0)
  mealPlanTotal         Decimal  @default(0)
  servicesTotal         Decimal  @default(0)
  subtotal              Decimal  @default(0)
  managerDiscountPct    Decimal  @default(0)
  finalTotal            Decimal  @default(0)
  prepaymentAmount      Decimal  @default(0)
  prepaymentPct         Int      @default(50)
  
  // Computed via app logic (not stored, but can be cached)
  // settlement = sum(charges) - sum(payments) — computed on fetch
  
  // Proposal
  proposalToken         String?  @unique
  proposalSentAt        DateTime?
  proposalViewedAt      DateTime?
  
  // Assignment
  assignedToId          String?
  assignedTo            User? @relation("orderAssignee", fields: [assignedToId], references: [id])
  previousAssigneeId    String?
  previousAssignee      User? @relation("orderPreviousAssignee", fields: [previousAssigneeId], references: [id])
  
  nextAction            String?
  nextActionDueAt       DateTime?
  
  // Payer (новий!)
  payerType             PayerType @default(SAME_AS_GUEST)
  payerId               String?
  payer                 Payer? @relation(fields: [payerId], references: [id])
  invoiceNumber         String?
  invoiceIssuedAt       DateTime?
  
  // Financial (inline, не окрема Folio!)
  charges               Charge[]
  payments              Payment[]
  paymentSchedule       PaymentSchedule[]
  
  // Related
  companions            OrderCompanion[]
  messages              Message[]
  touchpoints           Touchpoint[]
  tasks                 Task[]
  handoffs              Handoff[]
  conversations         Conversation[]
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([stage, assignedToId])
  @@index([checkIn])
  @@index([orderNumber])
  @@index([propertyId, stage])
  @@index([guestId, createdAt])
}

enum OrderStage {
  QUALIFY
  PROPOSAL
  AWAITING_PAYMENT
  PAID
  CHECKED_IN
  CHECKED_OUT
  LOST
  CANCELLED
}

enum LostReason {
  PRICE_TOO_HIGH
  CHOSE_COMPETITOR
  NO_AVAILABILITY
  DATES_CHANGED
  PERSONAL_REASONS
  BAD_TIMING
  WAITING_FOR_DECISION
  NO_RESPONSE
  OTHER
}

enum CancelReason {
  GUEST_CHANGED_MIND
  FAMILY_CIRCUMSTANCES
  FORCE_MAJEURE
  BOOKING_ERROR
  OTHER
}

enum CancelType {
  REFUND
  CREDIT_BALANCE
}

// ═══════════════════════════════════════════
// CHARGES & PAYMENTS (inline в Order)
// ═══════════════════════════════════════════

model Charge {
  id                String @id @default(cuid())
  
  orderId           String
  order             Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  type              ChargeType
  description       String
  amount            Decimal         // negative для discount / certificate / refund
  currency          String          @default("UAH")
  
  // Period (for multi-night split pricing)
  periodFrom        DateTime?
  periodTo          DateTime?
  nightsCount       Int?
  nightlyRate       Decimal?
  
  // Promo reference (if applied)
  promoId           String?
  
  createdByUserId   String
  createdBy         User @relation(fields: [createdByUserId], references: [id])
  
  createdAt         DateTime @default(now())
  
  @@index([orderId])
  @@index([type])
}

enum ChargeType {
  BASE_ACCOMMODATION
  MEAL_PLAN
  DISCOUNT_PROMO
  DISCOUNT_MANAGER
  DISCOUNT_LOYALTY
  UPSELL_FARMER
  UPSELL_IN_STAY
  SERVICE_TRANSFER
  SERVICE_SPA
  SERVICE_FB            // F&B (food & beverage)
  SERVICE_OTHER
  CERTIFICATE_APPLIED   // negative amount
  REFUND                // negative amount
  ADJUSTMENT
  TAX
}

model Payment {
  id                    String @id @default(cuid())
  
  orderId               String
  order                 Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  type                  PaymentType
  amount                Decimal
  currency              String   @default("UAH")
  
  status                PaymentStatus @default(PENDING)
  provider              PaymentProvider
  
  externalTransactionId String?   // WayForPay orderReference, LiqPay ID, etc.
  externalRawResponse   Json?     // full provider response
  
  paidAt                DateTime?
  refundedAt            DateTime?
  failureReason         String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([status, createdAt])
  @@index([externalTransactionId])
  @@index([orderId])
}

enum PaymentType {
  PREPAYMENT
  BALANCE
  IN_STAY_ADDITIONAL
  REFUND
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PaymentProvider {
  WAYFORPAY
  LIQPAY
  CASH
  BANK_TRANSFER
  CERTIFICATE
}

model PaymentSchedule {
  id              String @id @default(cuid())
  
  orderId         String
  order           Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  type            ScheduleType
  amount          Decimal
  dueAt           DateTime
  status          ScheduleStatus @default(PENDING)
  
  paidAt          DateTime?
  paymentId       String?     // related Payment.id якщо сплачено
  
  remindersSent   Int @default(0)
  lastReminderAt  DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([dueAt, status])
  @@index([orderId])
}

enum ScheduleType {
  PREPAYMENT
  BALANCE
  IN_STAY_OPEN
  CUSTOM
}

enum ScheduleStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

// ═══════════════════════════════════════════
// COMPANIONS (хто їздить з гостем)
// ═══════════════════════════════════════════

model OrderCompanion {
  id                  String @id @default(cuid())
  
  orderId             String
  order               Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  // Якщо компаньйон — наш гість
  guestId             String?
  guest               Guest? @relation(fields: [guestId], references: [id])
  
  // Standalone дані
  firstName           String
  lastName            String?
  birthDate           DateTime?
  isChild             Boolean  @default(false)
  ageAtStay           Int?
  
  // Document (для реєстрації поселення)
  documentType        DocumentType?
  documentNumber      String?    // ENCRYPTED
  
  // Відношення
  relationToMainGuest RelationType?
  relationNote        String?
  
  isMainGuest         Boolean  @default(false)
  isPaymentHolder     Boolean  @default(false)
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([orderId])
  @@index([guestId])
  @@index([birthDate])
}

// ═══════════════════════════════════════════
// PAYER (платник — юрособа або фізособа)
// ═══════════════════════════════════════════

model Payer {
  id                      String @id @default(cuid())
  
  type                    PayerType
  
  // Individual
  firstName               String?
  lastName                String?
  phone                   String?
  email                   String?
  individualTaxNumber     String?   // ІПН фізособи
  
  // Legal entity
  companyName             String?
  companyType             CompanyType?
  edrpouCode              String?   // ЄДРПОУ
  vatNumber               String?   // ІПН/VAT number
  isVatPayer              Boolean   @default(false)
  
  // Addresses
  legalAddress            String?
  actualAddress           String?
  
  // Bank
  bankAccountIban         String?
  bankName                String?
  bankMfo                 String?
  
  // Contact person
  contactPersonName       String?
  contactPersonPosition   String?
  contactPersonPhone      String?
  contactPersonEmail      String?
  
  // Relations
  linkedGuestId           String?   // якщо платник = наш гість
  orders                  Order[]
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  createdByUserId         String
  
  @@index([edrpouCode])
  @@index([type])
}

enum PayerType {
  SAME_AS_GUEST
  INDIVIDUAL
  LEGAL_ENTITY
}

enum CompanyType {
  TOV       // ТОВ (Limited Liability)
  FOP       // ФОП (Sole Proprietor)
  PP        // ПП (Private Enterprise)
  AT        // АТ (Joint Stock)
  OTHER
}

// ═══════════════════════════════════════════
// HANDOFF (передача Acquisition → Farmer)
// ═══════════════════════════════════════════

model Handoff {
  id                String @id @default(cuid())
  
  orderId           String
  order             Order @relation(fields: [orderId], references: [id])
  
  fromUserId        String
  toUserId          String
  
  handoffAt         DateTime @default(now())
  notes             String?
  
  autoGeneratedMessage String?   // повідомлення, яке авто-надіслано гостю
  
  createdAt         DateTime @default(now())
  
  @@index([orderId])
  @@index([toUserId])
}

// ═══════════════════════════════════════════
// TASKS (Задачі — завжди next action)
// ═══════════════════════════════════════════

model Task {
  id                String @id @default(cuid())
  
  type              TaskType
  title             String
  description       String?
  
  // Related to (one of):
  orderId           String?
  order             Order? @relation(fields: [orderId], references: [id])
  
  inquiryId         String?
  inquiry           Inquiry? @relation(fields: [inquiryId], references: [id])
  
  guestId           String?      // якщо birthday / anniversary
  
  assignedToId      String
  assignedTo        User @relation(fields: [assignedToId], references: [id])
  
  dueAt             DateTime
  completedAt       DateTime?
  
  status            TaskStatus @default(OPEN)
  
  result            String?     // result after wrap-up (optional)
  completionNotes   String?
  
  // Template / auto-generated
  isAutoGenerated   Boolean    @default(false)
  templateKey       String?    // для auto tasks: 'birthday_main', 'post_stay_call', etc.
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([assignedToId, status, dueAt])
  @@index([orderId])
  @@index([type])
}

enum TaskType {
  FIRST_CONTACT
  REPLY_TO_GUEST
  SEND_PROPOSAL
  PREPARE_PROPOSAL
  CHECK_PAYMENT
  CALL_OVERDUE
  PRE_ARRIVAL_7D
  PRE_ARRIVAL_1D
  MID_STAY_TOUCHPOINT
  POST_STAY_CALL
  BIRTHDAY_GREETING
  ANNIVERSARY_GREETING
  WINBACK
  SEASONAL_TRIGGER
  HANDOFF_INTRO
  FOLLOW_UP
  ESCALATION
  CUSTOM
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

// ═══════════════════════════════════════════
// MESSAGES & CONVERSATIONS (omnichannel)
// ═══════════════════════════════════════════

model Conversation {
  id                  String @id @default(cuid())
  
  guestId             String?
  channel             MessageChannel
  externalId          String      // ID у зовнішній системі
  
  orderId             String?     // related Order якщо створено
  order               Order? @relation(fields: [orderId], references: [id])
  
  assignedToId        String?
  status              ConversationStatus @default(OPEN)
  lastMessageAt       DateTime @default(now())
  
  messages            Message[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([channel, externalId])
  @@index([status, assignedToId])
  @@index([lastMessageAt])
}

enum ConversationStatus {
  OPEN
  ASSIGNED
  PENDING
  RESOLVED
  ARCHIVED
}

model Message {
  id              String @id @default(cuid())
  
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  inquiryId       String?
  inquiry         Inquiry? @relation(fields: [inquiryId], references: [id])
  
  orderId         String?
  order           Order? @relation(fields: [orderId], references: [id])
  
  direction       MessageDirection
  channel         MessageChannel
  content         String   @db.Text
  attachments     Json?
  
  sentByUserId    String?
  sentByAI        Boolean  @default(false)
  aiModel         String?
  
  externalId      String?
  
  createdAt       DateTime @default(now())
  
  @@index([conversationId, createdAt])
  @@index([orderId])
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}

enum MessageChannel {
  TELEGRAM
  INSTAGRAM
  HELPCRUNCH
  WHATSAPP
  FACEBOOK_MESSENGER
  EMAIL
  SMS
  PHONE_CALL
  SYSTEM
}

// ═══════════════════════════════════════════
// CERTIFICATES (сертифікати гостя)
// ═══════════════════════════════════════════

model Certificate {
  id                 String @id @default(cuid())
  code               String @unique
  
  guestId            String
  guest              Guest @relation(fields: [guestId], references: [id])
  
  amount             Decimal
  currency           String @default("UAH")
  
  source             CertificateSource
  issuedAt           DateTime @default(now())
  expiresAt          DateTime
  
  usedAt             DateTime?
  usedInOrderId      String?
  usedAmount         Decimal?
  
  blackoutDates      DateTime[] @default([])
  minOrderAmount     Decimal?
  
  issuedByUserId     String?
  
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  @@index([guestId, expiresAt])
  @@index([code])
}

enum CertificateSource {
  FAMILY_3RD_VISIT
  VIP_5TH_VISIT
  REFERRAL
  COMPENSATION
  CANCELLATION_CREDIT
  MANUAL_CEO
  ANNIVERSARY
  BIRTHDAY_GIFT
  OTHER
}

// ═══════════════════════════════════════════
// TOUCHPOINT (лог усіх взаємодій)
// ═══════════════════════════════════════════

model Touchpoint {
  id                  String @id @default(cuid())
  
  guestId             String
  guest               Guest @relation(fields: [guestId], references: [id])
  
  type                TouchpointType
  channel             String         // telegram / instagram / whatsapp / ...
  direction           MessageDirection
  
  content             String?        @db.Text
  pageUrl             String?
  campaignId          String?
  
  utmSource           String?
  utmMedium           String?
  utmCampaign         String?
  
  estimatedCost       Decimal?       // для ad_click
  
  inquiryId           String?
  inquiry             Inquiry? @relation(fields: [inquiryId], references: [id])
  
  orderId             String?
  order               Order? @relation(fields: [orderId], references: [id])
  
  messageId           String?
  
  occurredAt          DateTime
  createdAt           DateTime @default(now())
  
  @@index([guestId, occurredAt])
  @@index([type])
  @@index([orderId])
}

enum TouchpointType {
  CHAT_MESSAGE
  CALL
  FORM_SUBMIT
  WEBSITE_VISIT
  AD_CLICK
  EMAIL_OPEN
  EMAIL_CLICK
  BOT_INTERACTION
  PORTAL_VIEW
  STORY_REPLY
  COMMENT_REPLY
}

// ═══════════════════════════════════════════
// RETENTION CAMPAIGNS
// ═══════════════════════════════════════════

model RetentionCampaign {
  id              String @id @default(cuid())
  name            String
  
  triggerType     CampaignTriggerType
  triggerConfig   Json
  
  targetSegment   GuestSegment?
  messageTemplate String   @db.Text
  channels        String[]
  
  active          Boolean  @default(true)
  sentCount       Int      @default(0)
  openedCount     Int      @default(0)
  repliedCount    Int      @default(0)
  convertedCount  Int      @default(0)
  
  dispatches      CampaignDispatch[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum CampaignTriggerType {
  WINBACK_6M
  ANNIVERSARY_FIRST_VISIT
  BIRTHDAY_GUEST
  BIRTHDAY_COMPANION
  ANNIVERSARY_WEDDING
  SEASONAL_OPPOSITE
  EARLY_BOOKING
  LAST_MINUTE
  VIP_RE_ENGAGE
}

model CampaignDispatch {
  id              String @id @default(cuid())
  
  campaignId      String
  campaign        RetentionCampaign @relation(fields: [campaignId], references: [id])
  guestId         String
  
  channel         String
  sentAt          DateTime @default(now())
  openedAt        DateTime?
  repliedAt       DateTime?
  convertedAt     DateTime?
  
  @@index([campaignId, sentAt])
  @@unique([campaignId, guestId])
}

// ═══════════════════════════════════════════
// AUDIT LOG & AI USAGE
// ═══════════════════════════════════════════

model AuditLog {
  id              String @id @default(cuid())
  
  userId          String?
  user            User? @relation(fields: [userId], references: [id])
  
  action          String             // 'ORDER_STAGE_CHANGED', 'DOCUMENT_ACCESSED', ...
  entityType      String
  entityId        String
  changes         Json?              // { before: {...}, after: {...} }
  
  // For sensitive data access:
  sensitiveFieldAccessed String?     // 'documentNumber', 'bankAccountIban', etc.
  reasonForAccess        String?     // для GDPR audit
  
  ipAddress       String?            // hashed
  userAgent       String?
  
  createdAt       DateTime @default(now())
  
  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@index([sensitiveFieldAccessed])
}

model AIUsage {
  id              String @id @default(cuid())
  
  userId          String?
  user            User? @relation(fields: [userId], references: [id])
  
  model           String      // 'claude-haiku-4-5', 'claude-sonnet-4-6'
  feature         String      // 'qualify', 'reply-suggest', 'summary'
  inputTokens     Int
  outputTokens    Int
  costUSD         Decimal
  
  latencyMs       Int?
  success         Boolean @default(true)
  errorMessage    String?
  
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([feature, createdAt])
}

// ═══════════════════════════════════════════
// BACK REFERENCES (для referential integrity)
// ═══════════════════════════════════════════

// Додаткові відношення, які не видно на перший погляд,
// але потрібні для Prisma:

// Promo <-> Order (через PromoApplied table якщо потрібно)
// Це відкладено на Phase 3
```

---

# ЧАСТИНА 3 — Security: шифрування sensitive полів

## 3.1 Підхід

Використовуємо Prisma middleware для шифрування/дешифрування на льоту.

```typescript
// src/lib/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')  // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  // format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(ciphertext: string): string {
  const [iv, authTag, data] = ciphertext.split(':')
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    KEY, 
    Buffer.from(iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function maskDocument(documentNumber: string): string {
  if (!documentNumber) return ''
  return '••••••' + documentNumber.slice(-4)
}
```

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'
import { encrypt, decrypt } from './encryption'

const SENSITIVE_FIELDS = {
  Guest: ['documentNumber', 'documentIssuedBy', 'addressStreet'],
  OrderCompanion: ['documentNumber'],
  Payer: ['bankAccountIban'],
}

function createPrismaClient() {
  const client = new PrismaClient()
  
  client.$use(async (params, next) => {
    // Encrypt on write
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const fields = SENSITIVE_FIELDS[params.model as keyof typeof SENSITIVE_FIELDS]
      if (fields && params.args?.data) {
        for (const field of fields) {
          if (params.args.data[field]) {
            params.args.data[field] = encrypt(params.args.data[field])
          }
        }
      }
    }
    
    const result = await next(params)
    
    // Decrypt on read
    if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
      const fields = SENSITIVE_FIELDS[params.model as keyof typeof SENSITIVE_FIELDS]
      if (fields && result) {
        const decryptItem = (item: any) => {
          for (const field of fields) {
            if (item[field]) {
              try {
                item[field] = decrypt(item[field])
              } catch { /* may be not yet encrypted — ignore */ }
            }
          }
        }
        if (Array.isArray(result)) result.forEach(decryptItem)
        else decryptItem(result)
      }
    }
    
    return result
  })
  
  return client
}

export const prisma = createPrismaClient()
```

**Ключ шифрування:** `ENCRYPTION_KEY` в `.env`, 32-байтовий hex (генерується командою `openssl rand -hex 32`).

## 3.2 Masked display для обмежених ролей

```typescript
// src/components/shared/sensitive-field.tsx
'use client'

import { useUserRole } from '@/hooks/use-role'

type Props = {
  value: string
  fieldName: 'documentNumber' | 'bankAccountIban' | 'addressStreet'
}

const VISIBLE_ROLES = {
  documentNumber: ['ADMIN', 'CEO', 'RECEPTIONIST', 'ACCOUNTANT'],
  bankAccountIban: ['ADMIN', 'CEO', 'ACCOUNTANT'],
  addressStreet: ['ADMIN', 'CEO', 'RECEPTIONIST', 'ACCOUNTANT', 'FARMER'],
}

export function SensitiveField({ value, fieldName }: Props) {
  const role = useUserRole()
  const canSee = VISIBLE_ROLES[fieldName].includes(role)
  
  if (!canSee) {
    return <span className="text-muted-foreground">••••••</span>
  }
  
  return <span>{value}</span>
}
```

---

# ЧАСТИНА 4 — RBAC (authorization)

```typescript
// src/lib/auth.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null
  
  let user = await prisma.user.findUnique({ where: { id: userId } })
  
  // Auto-provision on first login
  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) return null
    
    user = await prisma.user.create({
      data: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role: 'ACQUISITION',  // default
      },
    })
  }
  
  return user
}

export async function requireRole(allowed: UserRole[]) {
  const user = await getCurrentUser()
  if (!user || !allowed.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

// Permission matrix  
export const PERMISSIONS = {
  ORDERS_READ_ALL:         ['ADMIN', 'CEO', 'SALES_HEAD', 'HOTEL_MANAGER'],
  ORDERS_READ_OWN:         ['ACQUISITION', 'FARMER'],
  ORDERS_WRITE:            ['ADMIN', 'CEO', 'SALES_HEAD', 'ACQUISITION', 'FARMER', 'HOTEL_MANAGER'],
  ORDERS_CANCEL:           ['ADMIN', 'CEO', 'SALES_HEAD', 'HOTEL_MANAGER'],
  ORDERS_REFUND:           ['ADMIN', 'CEO', 'ACCOUNTANT', 'HOTEL_MANAGER'],
  
  GUESTS_READ:             ['*'],  // всі ролі
  GUESTS_WRITE:            ['ADMIN', 'CEO', 'ACQUISITION', 'FARMER', 'RECEPTIONIST'],
  
  DOCUMENTS_READ:          ['ADMIN', 'CEO', 'RECEPTIONIST', 'ACCOUNTANT'],
  DOCUMENTS_WRITE:         ['ADMIN', 'CEO', 'RECEPTIONIST'],
  
  PAYMENTS_READ_ALL:       ['ADMIN', 'CEO', 'ACCOUNTANT', 'HOTEL_MANAGER'],
  PAYMENTS_WRITE:          ['ADMIN', 'CEO', 'ACCOUNTANT'],
  
  TARIFFS_WRITE:           ['ADMIN', 'CEO', 'REVENUE_MANAGER', 'HOTEL_MANAGER'],
  PROMOS_WRITE:            ['ADMIN', 'CEO', 'REVENUE_MANAGER'],
  
  CAMPAIGNS_WRITE:         ['ADMIN', 'CEO', 'MARKETER'],
  
  SETTINGS_WRITE:          ['ADMIN', 'CEO'],
  AUDIT_LOG_READ:          ['ADMIN', 'CEO', 'SALES_HEAD', 'HOTEL_MANAGER'],
} as const

export async function requirePermission(permission: keyof typeof PERMISSIONS) {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  
  const allowed = PERMISSIONS[permission]
  if (!allowed.includes('*') && !allowed.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

// Filter query by property (for multi-property)
export async function withPropertyScope<T>(
  query: T,
  options: { ownerField?: string } = {}
): Promise<T> {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  
  if (['ADMIN', 'CEO'].includes(user.role)) {
    return query  // no scoping
  }
  
  if (user.role === 'HOTEL_MANAGER' && user.assignedProperties.length > 0) {
    return {
      ...query,
      where: {
        ...(query as any).where,
        propertyId: { in: user.assignedProperties },
      },
    } as T
  }
  
  return query
}
```

---

# ЧАСТИНА 5 — Ключові Server Actions (приклади)

## 5.1 Create Order from Inquiry

```typescript
// src/features/orders/actions/create-from-inquiry.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { generateOrderNumber } from '../utils/order-number'

export const CreateOrderFromInquirySchema = z.object({
  inquiryId: z.string().cuid(),
})

export async function createOrderFromInquiry(
  input: z.infer<typeof CreateOrderFromInquirySchema>
) {
  const user = await requirePermission('ORDERS_WRITE')
  const { inquiryId } = CreateOrderFromInquirySchema.parse(input)
  
  const result = await prisma.$transaction(async (tx) => {
    const inquiry = await tx.inquiry.findUnique({
      where: { id: inquiryId },
      include: { guest: true },
    })
    if (!inquiry) throw new Error('Inquiry not found')
    if (inquiry.status === 'CONVERTED') throw new Error('Already converted')
    
    // Create Order
    const order = await tx.order.create({
      data: {
        orderNumber: await generateOrderNumber(tx),
        guestId: inquiry.guestId!,
        propertyId: inquiry.guest?.preferences?.lastPropertyId ?? 'default',
        stage: 'QUALIFY',
        source: inquiry.source,
        sourceChannel: inquiry.sourceChannel,
        assignedToId: user.id,
        nextAction: 'Підготувати пропозицію',
        nextActionDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),  // +2 hours
      },
    })
    
    // Update Inquiry
    await tx.inquiry.update({
      where: { id: inquiryId },
      data: {
        status: 'CONVERTED',
        convertedToOrderId: order.id,
      },
    })
    
    // Create Task
    await tx.task.create({
      data: {
        type: 'PREPARE_PROPOSAL',
        title: 'Підготувати пропозицію',
        orderId: order.id,
        assignedToId: user.id,
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    })
    
    // Audit log
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'ORDER_CREATED_FROM_INQUIRY',
        entityType: 'Order',
        entityId: order.id,
        changes: { inquiryId, orderId: order.id },
      },
    })
    
    return order
  })
  
  revalidatePath('/chats')
  revalidatePath('/orders')
  revalidatePath('/today')
  
  return { success: true, orderId: result.id, orderNumber: result.orderNumber }
}
```

## 5.2 Pricing Engine

```typescript
// src/features/payments/pricing/calculate-rate.ts
import { prisma } from '@/lib/prisma'
import { eachDayOfInterval, startOfDay } from 'date-fns'
import { findBestPromo } from './find-best-promo'

type PricingInput = {
  propertyId: string
  roomType: 'STANDARD' | 'FAMILY' | 'DELUXE' | 'SUITE'
  checkIn: Date
  checkOut: Date
  adults: number
  children: number
  guestSegment: 'NEW' | 'FRIEND' | 'FAMILY' | 'VIP'
  channel: string
  mealPlan: 'NONE' | 'BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE'
}

type NightlyRate = {
  date: Date
  baseRate: number
  promoApplied?: { id: string; name: string }
  finalRate: number
}

export async function calculatePricing(input: PricingInput) {
  const nights = eachDayOfInterval({
    start: input.checkIn,
    end: new Date(input.checkOut.getTime() - 24 * 60 * 60 * 1000),
  })
  
  const nightlyRates: NightlyRate[] = []
  
  for (const night of nights) {
    // Find BAR for this night
    const tariff = await prisma.tariff.findFirst({
      where: {
        propertyId: input.propertyId,
        roomType: input.roomType,
        validFrom: { lte: night },
        validTo: { gte: night },
      },
      orderBy: { pricePerNight: 'asc' },  // lowest valid BAR if multiple
    })
    
    if (!tariff) {
      throw new Error(`No tariff found for ${input.roomType} on ${night.toISOString()}`)
    }
    
    const baseRate = Number(tariff.pricePerNight)
    
    // Find best promo for this night
    const bestPromo = await findBestPromo({
      propertyId: input.propertyId,
      roomType: input.roomType,
      night,
      nightsTotal: nights.length,
      adults: input.adults,
      children: input.children,
      guestSegment: input.guestSegment,
      channel: input.channel,
      bookingDate: new Date(),
      baseRate,
    })
    
    const finalRate = bestPromo
      ? bestPromo.overridePrice ?? baseRate * (1 - bestPromo.discountPct / 100)
      : baseRate
    
    nightlyRates.push({
      date: night,
      baseRate,
      promoApplied: bestPromo ? { id: bestPromo.id, name: bestPromo.name } : undefined,
      finalRate: Math.round(finalRate),
    })
  }
  
  const accommodationTotal = nightlyRates.reduce((sum, n) => sum + n.finalRate, 0)
  
  // Meal plan (if applicable)
  const mealPrices = {
    NONE: 0,
    BREAKFAST: 250,
    HALF_BOARD: 500,
    FULL_BOARD: 800,
    ALL_INCLUSIVE: 1200,
  }
  const mealPlanTotal = mealPrices[input.mealPlan] * (input.adults + input.children) * nights.length
  
  const subtotal = accommodationTotal + mealPlanTotal
  
  // Prepayment rate
  const prepayRates = {
    NEW: 50,
    FRIEND: 30,
    FAMILY: 30,
    VIP: 20,
  }
  const prepayPct = prepayRates[input.guestSegment]
  const prepayAmount = Math.round((subtotal * prepayPct) / 100)
  
  return {
    nightlyRates,
    accommodationTotal,
    mealPlanTotal,
    subtotal,
    finalTotal: subtotal,  // before manager discount
    prepayPct,
    prepayAmount,
    balanceAmount: subtotal - prepayAmount,
  }
}
```

## 5.3 Birthday check cron

```typescript
// src/app/api/cron/birthday-check/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const today = new Date()
  const day = today.getDate()
  const month = today.getMonth() + 1
  
  // 1. Find guests with birthday today
  const guestsWithBirthday = await prisma.$queryRaw<Array<{id: string, firstName: string, lastName: string, birthDate: Date, assignedFarmerId: string | null}>>`
    SELECT g.id, g."firstName", g."lastName", g."birthDate",
           (SELECT "assignedToId" FROM "Order" WHERE "guestId"=g.id 
            AND stage='CHECKED_OUT' ORDER BY "checkOut" DESC LIMIT 1) as "assignedFarmerId"
    FROM "Guest" g
    WHERE EXTRACT(DAY FROM g."birthDate") = ${day}
      AND EXTRACT(MONTH FROM g."birthDate") = ${month}
      AND g."gdprDeletionRequested" = false
  `
  
  // 2. Find companions with birthday today
  const companionsWithBirthday = await prisma.$queryRaw<Array<any>>`
    SELECT oc.id, oc."firstName", oc."lastName", oc."birthDate", oc."relationToMainGuest",
           o."guestId" as "mainGuestId",
           (SELECT "assignedToId" FROM "Order" WHERE "guestId"=o."guestId" 
            AND stage='CHECKED_OUT' ORDER BY "checkOut" DESC LIMIT 1) as "assignedFarmerId"
    FROM "OrderCompanion" oc
    JOIN "Order" o ON oc."orderId" = o.id
    WHERE oc."birthDate" IS NOT NULL
      AND EXTRACT(DAY FROM oc."birthDate") = ${day}
      AND EXTRACT(MONTH FROM oc."birthDate") = ${month}
    GROUP BY oc.id, o."guestId"  -- dedupe
  `
  
  // 3. Create tasks for Farmers
  const tasksCreated = []
  
  for (const guest of guestsWithBirthday) {
    if (!guest.assignedFarmerId) continue
    
    tasksCreated.push(await prisma.task.create({
      data: {
        type: 'BIRTHDAY_GREETING',
        title: `Привітати ${guest.firstName} з днем народження`,
        description: `ДН сьогодні. Надіслати персональне повідомлення + розглянути знижку.`,
        guestId: guest.id,
        assignedToId: guest.assignedFarmerId,
        dueAt: new Date(today.setHours(18, 0, 0, 0)),
        isAutoGenerated: true,
        templateKey: 'birthday_main_guest',
      },
    }))
  }
  
  for (const comp of companionsWithBirthday) {
    if (!comp.assignedFarmerId) continue
    
    tasksCreated.push(await prisma.task.create({
      data: {
        type: 'BIRTHDAY_GREETING',
        title: `Привітати ${comp.firstName} (${comp.relationToMainGuest})`,
        description: `ДН компаньйона головного гостя.`,
        guestId: comp.mainGuestId,
        assignedToId: comp.assignedFarmerId,
        dueAt: new Date(today.setHours(18, 0, 0, 0)),
        isAutoGenerated: true,
        templateKey: comp.isChild ? 'birthday_child_companion' : 'birthday_adult_companion',
      },
    }))
  }
  
  return NextResponse.json({ 
    success: true, 
    guestsProcessed: guestsWithBirthday.length,
    companionsProcessed: companionsWithBirthday.length,
    tasksCreated: tasksCreated.length,
  })
}
```

## 5.4 Telegram webhook

```typescript
// src/app/api/webhooks/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      username: z.string().optional(),
      first_name: z.string(),
      last_name: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
    }),
    date: z.number(),
    text: z.string().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  
  const body = await req.json()
  const parsed = TelegramUpdateSchema.parse(body)
  
  if (!parsed.message?.text) {
    return NextResponse.json({ ok: true })
  }
  
  const { message } = parsed
  const telegramUserId = message.from.id.toString()
  
  await prisma.$transaction(async (tx) => {
    // Find or create Guest
    let guest = await tx.guest.findFirst({
      where: { telegramUserId },
    })
    
    if (!guest) {
      guest = await tx.guest.create({
        data: {
          firstName: message.from.first_name,
          lastName: message.from.last_name ?? null,
          telegramUserId,
          telegramUsername: message.from.username ?? null,
          telegramChatId: message.chat.id.toString(),
          firstTouchpointChannel: 'telegram',
          firstTouchpointAt: new Date(),
          lastTouchpointChannel: 'telegram',
          lastTouchpointAt: new Date(),
        },
      })
    } else {
      await tx.guest.update({
        where: { id: guest.id },
        data: {
          lastTouchpointChannel: 'telegram',
          lastTouchpointAt: new Date(),
        },
      })
    }
    
    // Find or create Conversation
    const conversation = await tx.conversation.upsert({
      where: {
        channel_externalId: {
          channel: 'TELEGRAM',
          externalId: message.chat.id.toString(),
        },
      },
      create: {
        guestId: guest.id,
        channel: 'TELEGRAM',
        externalId: message.chat.id.toString(),
        status: 'OPEN',
      },
      update: {
        lastMessageAt: new Date(),
      },
    })
    
    // Create Message
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        channel: 'TELEGRAM',
        content: message.text!,
        externalId: message.message_id.toString(),
      },
    })
    
    // Check if Inquiry exists for this conversation
    const existingInquiry = await tx.inquiry.findFirst({
      where: {
        guestId: guest.id,
        status: { in: ['NEW', 'WARMING'] },
      },
    })
    
    if (!existingInquiry) {
      // Create new Inquiry
      const inquiry = await tx.inquiry.create({
        data: {
          guestId: guest.id,
          source: 'TELEGRAM',
          sourceChannel: `tg_${message.chat.id}`,
          status: 'NEW',
        },
      })
      
      // Create Touchpoint
      await tx.touchpoint.create({
        data: {
          guestId: guest.id,
          type: 'CHAT_MESSAGE',
          channel: 'telegram',
          direction: 'INBOUND',
          content: message.text!.slice(0, 500),
          inquiryId: inquiry.id,
          occurredAt: new Date(),
        },
      })
    }
  })
  
  return NextResponse.json({ ok: true })
}
```

---

# ЧАСТИНА 6 — Environment Variables

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@host:5432/ruta_crm"

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/today
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/today

# Encryption (32 bytes hex)
ENCRYPTION_KEY=""  # openssl rand -hex 32

# Anthropic (AI — Phase 5)
ANTHROPIC_API_KEY=""

# Payments
WAYFORPAY_MERCHANT_ACCOUNT=""
WAYFORPAY_MERCHANT_SECRET=""
LIQPAY_PUBLIC_KEY=""
LIQPAY_PRIVATE_KEY=""

# Messaging
TELEGRAM_BOT_TOKEN=""
TELEGRAM_WEBHOOK_SECRET=""
HELPCRUNCH_API_KEY=""
HELPCRUNCH_WEBHOOK_SECRET=""
RINGOSTAT_API_KEY=""
RINGOSTAT_WEBHOOK_SECRET=""
META_APP_ID=""
META_APP_SECRET=""
META_WEBHOOK_VERIFY_TOKEN=""

# Marketing APIs (Phase 3)
META_ACCESS_TOKEN=""
GOOGLE_ADS_DEVELOPER_TOKEN=""
GOOGLE_ADS_CLIENT_ID=""
GOOGLE_ADS_CLIENT_SECRET=""
GOOGLE_ADS_REFRESH_TOKEN=""

# PMS
SERVIO_BASE_URL=""
SERVIO_API_TOKEN=""

# Cron
CRON_SECRET=""  # random string to protect cron endpoints

# Monitoring
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""

# App
NEXT_PUBLIC_APP_URL="https://crm.ruta.cam"
NODE_ENV="production"
```

---

# ЧАСТИНА 7 — Deploy (Hetzner + Coolify)

Використовуючи існуючий Hetzner CX42 з Coolify:

```yaml
# docker-compose.yml (для Coolify raw compose)
version: '3.8'

services:
  ruta-crm:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      # ... all env vars
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ruta_crm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

**Alternative:** Vercel для app + Neon/Supabase для Postgres.

---

# ЧАСТИНА 8 — Roadmap фаз (фінальний)

## Phase 1 — MVP Acquisition (тижні 1-3)

**Ціль:** замінити Odoo для acquisition менеджерів. Telegram only.

- [x] Setup: Clone Kiranism, Clerk, Prisma, PostgreSQL
- [x] Schema: User, Guest (базова), Property, Room, Tariff, Inquiry, Order, Charge, Payment, PaymentSchedule, Task, Conversation, Message, AuditLog
- [x] Меню: Сьогодні, Чати, Замовлення, Гості (3 ролі: Admin, Sales Head, Acquisition)
- [x] Telegram webhook → Inquiry
- [x] Кнопка "Створити замовлення" в чаті
- [x] Картка Order з 5 вкладками (Запит, Взаєморозрахунки, Заїзд, Комунікації, Маркетинг)
- [x] Context Sync Panel (right side)
- [x] Task-driven: Next Action, save blockers, mandatory wrap-up
- [x] WayForPay integration + tokenized proposal page
- [x] Today dashboard + Завершення дня widget

## Phase 2 — Scale (тижні 4-7)
- [ ] Ringostat + auto-create Order
- [ ] Instagram + HelpCrunch
- [ ] GuestRelation + OrderCompanion
- [ ] Birthday automation (cron + templates)
- [ ] Payer entity (INDIVIDUAL)
- [ ] Менеджер розвитку role + handoff chain
- [ ] Post-stay T+2 call task
- [ ] Simple Calendar (single property)

## Phase 3 — Full Platform (тижні 8-11)
- [ ] Calendar multi-property
- [ ] Pricing engine повний (BAR + промо + cascade)
- [ ] Payer LEGAL_ENTITY з рахунками-фактурами
- [ ] Швидке заселення UI з документами + encryption
- [ ] Реєстр платежів (бухгалтерський)
- [ ] Retention campaigns (winback/anniversary/seasonal)
- [ ] Certificates UI + rules
- [ ] Servio PMS sync (read-only)
- [ ] Meta Ads API + Google Ads attribution

## Phase 4 — Polish (тижні 12-15)
- [ ] Guest Portal full
- [ ] Website direct bookings
- [ ] Booking.com OTA import
- [ ] OCR паспортів
- [ ] Mobile manager
- [ ] GDPR export + deletion
- [ ] Command palette повний
- [ ] Advanced dashboards

## Phase 5 — AI Layer (тижні 16-19)
- [ ] AI qualify (Haiku)
- [ ] AI reply suggest (Sonnet) з ⌘J
- [ ] AI guest summary (daily cron)
- [ ] AI birthday message personalization
- [ ] AI smart search
- [ ] Call transcription

## Phase 6+ — B2B & Expansion
- [ ] B2B RFP pipeline
- [ ] Group bookings
- [ ] Contract templates
- [ ] Accounting module (full заміна Odoo)

---

**Кінець Implementation Specification v2.7.**

**Супутні документи:**
- `CLAUDE.md` — для Claude Code проєкту
- `PHASE_1_SETUP_PROMPT.md` — перший промт для старту
