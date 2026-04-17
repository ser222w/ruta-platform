# Data Model — Ruta OS
# Entities not covered in architecture.md: advanced guest graph, companions, payer, retention, audit

---

## GuestRelation

Links between guest profiles. Used for birthday automation, companion pre-fill, anniversary reminders.

```prisma
model GuestRelation {
  id               String         @id @default(cuid())
  guestId          String
  guest            Guest          @relation("guestMain", fields: [guestId], references: [id])
  relatedGuestId   String
  relatedGuest     Guest          @relation("guestRelated", fields: [relatedGuestId], references: [id])
  relationType     RelationType
  relationNote     String?        // "донечка Даринка", "мама", "друг зі студентства"
  anniversaryDate  DateTime?      // для подружжя — дата весілля
  source           RelationSource @default(MANUAL_INPUT)
  isConfirmed      Boolean        @default(false)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([guestId, relatedGuestId, relationType])
  @@index([guestId])
  @@index([relatedGuestId])
  @@index([anniversaryDate])  // for birthday cron
}

enum RelationType { SPOUSE PARTNER CHILD PARENT SIBLING FRIEND COLLEAGUE OTHER }
enum RelationSource { MANUAL_INPUT CHECK_IN_REGISTRATION INFERRED_FROM_BOOKINGS GUEST_PORTAL_SELF }
```

---

## OrderCompanion

Who travels with the main guest per booking. Can be a registered Guest or standalone person.

```prisma
model OrderCompanion {
  id                  String        @id @default(cuid())
  orderId             String
  order               Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  guestId             String?       // null if standalone
  guest               Guest?        @relation(fields: [guestId], references: [id])

  firstName           String
  lastName            String?
  birthDate           DateTime?
  isChild             Boolean       @default(false)
  ageAtStay           Int?          // computed at creation

  documentType        DocumentType?
  documentNumber      String?       // AES-256-GCM encrypted

  relationToMainGuest RelationType?
  relationNote        String?       // "донечка Даринка, 8 років"

  isMainGuest         Boolean       @default(false)
  isPaymentHolder     Boolean       @default(false)

  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@index([orderId])
  @@index([guestId])
  @@index([birthDate])  // for birthday cron
}

enum DocumentType { PASSPORT_UA ID_CARD FOREIGN_PASSPORT BIRTH_CERTIFICATE }
```

---

## Payer

Payment entity — individual or legal entity. Linked to Order.

```prisma
model Payer {
  id                    String       @id @default(cuid())
  type                  PayerType

  // ── Individual (ФІЗОСОБА) ──
  firstName             String?
  lastName              String?
  phone                 String?
  email                 String?
  individualTaxNumber   String?      // ІПН

  // ── Legal Entity (ЮРОСОБА) ──
  companyName           String?      // "ТОВ Kovalenko Consulting"
  companyType           CompanyType?
  edrpouCode            String?      // 8-символьний ЄДРПОУ
  vatNumber             String?      // 12-символьний ІПН
  isVatPayer            Boolean      @default(false)
  legalAddress          String?
  actualAddress         String?

  // Bank
  bankAccountIban       String?      // AES-256-GCM encrypted
  bankName              String?
  bankMfo               String?      // МФО банку

  // Contact person (for legal entity)
  contactPersonName     String?
  contactPersonPosition String?      // "Бухгалтер", "Директор"
  contactPersonPhone    String?
  contactPersonEmail    String?

  linkedGuestId         String?      // if payer = guest
  orders                Order[]

  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  createdByUserId       String

  @@index([edrpouCode])
  @@index([type])
}

enum PayerType   { SAME_AS_GUEST INDIVIDUAL LEGAL_ENTITY }
enum CompanyType { TOV FOP PP AT OTHER }
```

Invoice auto-generation when `payerType = LEGAL_ENTITY`:
- Format: `INV-{YYYY}-{MM}-{NNNN}`
- VAT calc if `isVatPayer = true`

---

## Touchpoint

Every interaction with a guest — for attribution and LTV tracking.

```prisma
model Touchpoint {
  id              String           @id @default(cuid())
  guestId         String
  guest           Guest            @relation(fields: [guestId], references: [id])
  type            TouchpointType
  channel         String
  direction       MessageDirection
  content         String?          @db.Text
  pageUrl         String?
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?
  estimatedCost   Decimal?
  inquiryId       String?
  orderId         String?
  messageId       String?
  occurredAt      DateTime
  createdAt       DateTime         @default(now())

  @@index([guestId, occurredAt])
  @@index([type])
  @@index([orderId])
}

enum TouchpointType {
  CHAT_MESSAGE CALL FORM_SUBMIT WEBSITE_VISIT AD_CLICK
  EMAIL_OPEN EMAIL_CLICK BOT_INTERACTION PORTAL_VIEW
  STORY_REPLY COMMENT_REPLY
}
```

---

## RetentionCampaign + CampaignDispatch

Automated retention campaigns triggered by guest lifecycle events.

```prisma
model RetentionCampaign {
  id              String                @id @default(cuid())
  name            String
  triggerType     CampaignTriggerType
  triggerConfig   Json                  // e.g. { daysAfterCheckout: 180 }
  targetSegment   GuestSegment?
  messageTemplate String                @db.Text
  channels        String[]              // ['telegram', 'whatsapp']
  active          Boolean               @default(true)
  sentCount       Int                   @default(0)
  openedCount     Int                   @default(0)
  repliedCount    Int                   @default(0)
  convertedCount  Int                   @default(0)
  dispatches      CampaignDispatch[]
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
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
  id          String            @id @default(cuid())
  campaignId  String
  campaign    RetentionCampaign @relation(fields: [campaignId], references: [id])
  guestId     String
  channel     String
  sentAt      DateTime          @default(now())
  openedAt    DateTime?
  repliedAt   DateTime?
  convertedAt DateTime?

  @@index([campaignId, sentAt])
  @@unique([campaignId, guestId])
}
```

---

## AuditLog

Every state change + sensitive field access.

```prisma
model AuditLog {
  id                     String   @id @default(cuid())
  userId                 String?
  user                   User?    @relation(fields: [userId], references: [id])
  action                 String   // ORDER_CREATED_FROM_INQUIRY, STAGE_CHANGED, etc.
  entityType             String   // "Order", "Guest", "Payment"
  entityId               String
  changes                Json?    // { before: {stage:'QUALIFY'}, after: {stage:'PROPOSAL_1'} }
  sensitiveFieldAccessed String?  // "documentNumber", "bankAccountIban"
  reasonForAccess        String?
  ipAddress              String?
  userAgent              String?
  createdAt              DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@index([sensitiveFieldAccessed])
}
```

---

## Sensitive Data (Encryption + RBAC)

**Fields encrypted at rest (AES-256-GCM via Prisma middleware):**
```
Guest:         documentNumber, documentIssuedBy, addressStreet
OrderCompanion: documentNumber
Payer:         bankAccountIban
```

**Masked display (`SensitiveField` component):**
```typescript
const VISIBLE_ROLES = {
  documentNumber: ['ADMIN', 'CEO', 'RECEPTIONIST', 'ACCOUNTANT'],
  bankAccountIban: ['ADMIN', 'CEO', 'ACCOUNTANT'],
  addressStreet:  ['ADMIN', 'CEO', 'RECEPTIONIST', 'ACCOUNTANT', 'FARMER'],
}
// Non-permitted roles see: "••••••6789" (last 4 chars visible)
```

**Access audit:** Every read of a sensitive field → AuditLog entry with `sensitiveFieldAccessed`.

**Retention:** Auto-purge after 3 years (UA law). Documents deleted first on GDPR right-to-deletion request.

---

## Birthday Automation Cron

Runs daily at **09:00**. Auto-due at **18:00**. Auto-sends at **17:00** if Farmer didn't process.

```
Query: guests WHERE DAY(birthDate)=today AND MONTH(birthDate)=today
Query: companions WHERE same condition
Query: guestRelations WHERE DAY(anniversaryDate)=today

→ Create Task type=BIRTHDAY_GREETING for assigned Farmer
  templateKey: 'birthday_main_guest' | 'birthday_child_companion' | 'anniversary_wedding'
```

**Message templates:**
- `birthday_main_guest`: "З днем народження, [Name]! 🎂 Даруємо сертифікат ₴3,000"
- `birthday_child_companion`: "Даринці сьогодні [Age]! Вітаємо, [MainGuestName]. Даринці — безкоштовні SPA"
- `anniversary_wedding`: "[N] років разом! Вітаємо, [Name1] та [Name2]. Романтичний сніданок + вино"

Route: `GET /api/cron/birthday-check` (Bearer `CRON_SECRET`)

---

## Farmer Retention Cycle (T+0 → T+180)

```
T+0 (checkout day)
  AUTO: stage=CHECKED_OUT, visitCount++, segment recalc
  AUTO: certificate if 3rd visit (₴6,000) or 5th visit (₴10,000 + VIP)
  AUTO: Task for Farmer "Післязаїздний дзвінок" due T+2
  AUTO: Telegram NPS to guest

T+2 — Farmer call/message
  Script: подяка → feedback → preferences update → soft-qualify "коли наступна поїздка?"
  → nагадати про сертифікат (без тиску)

T+3 — Mandatory wrap-up
  Farmer records: interest level (yes/maybe/no), estimated period, cert intent
  AUTO next task:
    yes    → "Надіслати пропозицію" in 7-14 days
    maybe  → "Нагадати" in 30 days
    no     → "Сезонний тригер" in 90 days

T+7..T+14 — Personalized proposal (if yes/maybe)
  "Олено, пам'ятаю що сподобався вид на гори з A-201.
   У липні wellness-тиждень — забронювати заздалегідь?"
  → if reply → new Inquiry auto-created → Path A (assigned to Farmer)

T+30 / T+60 / T+90 — Seasonal triggers
  Farmer gets task with pre-generated template (Phase 5 = AI personalization)

T+180 — Winback
  HIGH priority lead auto-created
  Farmer task: "VIP-winback" with full guest history
```
