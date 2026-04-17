# Phase 1 Setup Prompt — First Claude Code Session

> Скопіюй цей промт цілком і вставляй у Claude Code в новому проєкті `ruta-crm`.

---

## 📋 Session Goal

**Ціль цієї сесії:** підготувати foundation проекту RUTA CRM для Phase 1 MVP.

**Scope цієї сесії:**
1. Setup проекту на базі Kiranism template
2. Налаштування Prisma з initial schema (Phase 1 моделі)
3. Clerk auth + RBAC helpers
4. Encryption middleware для sensitive полів
5. Базова структура папок (features/)
6. Перші 3 Prisma міграції + seed data
7. Health check page

**НЕ в scope цієї сесії:** фічі (Чати, Замовлення, Order UI). Це буде наступна сесія.

---

## 📖 Required Reading (before you start)

Прочитай у цьому порядку:

1. `CLAUDE.md` — твоя конфігурація і 26 principles
2. `RUTA_CRM_v2_5_MASTER.md` (частини 1-4, 7, 13) — філософія, термінологія, data model basics
3. `RUTA_CRM_IMPLEMENTATION_v2_7.md` (частини 1-4) — file structure, Prisma schema, encryption

---

## 🎯 Step-by-step Tasks

### Task 1: Clone Kiranism template

```bash
# У батьківській директорії:
git clone https://github.com/kiranism/next-shadcn-dashboard-starter ruta-crm
cd ruta-crm

# Clean git history (новий проект)
rm -rf .git
git init
git add -A
git commit -m "Initial commit from Kiranism template"
```

### Task 2: Update package.json

**Ціль:** rename + bump Node version to 22.

Зміни в `package.json`:
```json
{
  "name": "ruta-crm",
  "version": "0.1.0",
  "description": "RUTA Group omnichannel CRM",
  "engines": {
    "node": ">=22.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

Install dependencies: `pnpm install`

### Task 3: Install additional deps

```bash
pnpm add @prisma/client @clerk/nextjs nuqs zod react-hook-form @hookform/resolvers date-fns @tanstack/react-query
pnpm add -D prisma @types/node
```

### Task 4: Setup environment

Створи `.env.example` і `.env.local` за списком з `RUTA_CRM_IMPLEMENTATION_v2_7.md` Частина 6.

**Важливо:** `ENCRYPTION_KEY` генеруй через:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Це 64-символьний hex string.

### Task 5: Initialize Prisma

```bash
pnpm prisma init
```

Замінь автоматично згенерований `prisma/schema.prisma` на **Phase 1 subset** з `RUTA_CRM_IMPLEMENTATION_v2_7.md`.

**Phase 1 models (включити ТІЛЬКИ ці):**

1. `User` + `UserRole` enum (всі 10 ролей для future-proof)
2. `Property`
3. `Room` + `RoomType` enum
4. `Tariff` + `MealPlan` enum
5. `Guest` (з БАЗОВИМИ полями — не треба поки UTM tracking, document, birthDate, GDPR)
   - Базові: id, firstName, lastName, email, phone, language, preferences (Json), segment, visitsCount, totalSpent, ltv, lastStayDate, portalToken, timestamps
   - Додай: telegramUserId, telegramUsername, telegramChatId (для Phase 1 Telegram integration)
6. `Inquiry` + enums (`InquirySource`, `InquiryStatus`, `UnqualifiedReason`)
7. `Order` + enums (`OrderStage`, `LostReason`, `CancelReason`, `CancelType`, `PayerType`)
8. `Charge` + `ChargeType` enum
9. `Payment` + enums (`PaymentType`, `PaymentStatus`, `PaymentProvider`)
10. `PaymentSchedule` + enums (`ScheduleType`, `ScheduleStatus`)
11. `Task` + enums (`TaskType`, `TaskStatus`)
12. `Conversation` + `ConversationStatus` enum
13. `Message` + enums (`MessageDirection`, `MessageChannel`)
14. `AuditLog`

**Скажи "ні" для Phase 1 (додамо в Phase 2+):**
- GuestRelation
- OrderCompanion
- Payer (поки тільки `Order.payerType = SAME_AS_GUEST` використовуємо)
- Certificate
- Touchpoint (базова аналітика через AuditLog достатня)
- RetentionCampaign, CampaignDispatch
- Promo (поки без знижок)
- Handoff (поки без Farmer)
- AIUsage (Phase 5)

Запусти initial migration:
```bash
pnpm prisma migrate dev --name initial_phase1
pnpm prisma generate
```

### Task 6: Create `src/lib/prisma.ts`

Singleton Prisma client **з encryption middleware** за специфікацією з `RUTA_CRM_IMPLEMENTATION_v2_7.md` Частина 3.

**Phase 1:** sensitive fields — None поки. Просто підготуй middleware структуру порожньою (закоментуй), щоб легко додати в Phase 2.

### Task 7: Create `src/lib/encryption.ts`

Повна implementation з `RUTA_CRM_IMPLEMENTATION_v2_7.md` Частина 3.1:
- `encrypt(plaintext)` — AES-256-GCM
- `decrypt(ciphertext)` — reverse
- `maskDocument(docNumber)` — для UI display
- `hashForStorage(value)` — SHA-256 для IP addresses

### Task 8: Create `src/lib/auth.ts`

RBAC helpers за `RUTA_CRM_IMPLEMENTATION_v2_7.md` Частина 4:
- `getCurrentUser()` — auto-provision Clerk user у Prisma
- `requireRole(allowed[])`
- `requirePermission(key)`
- `PERMISSIONS` map
- `withPropertyScope(query)` — filter для multi-property

**Phase 1 ролі що активні:** ADMIN, SALES_HEAD, ACQUISITION. Решта є у enum але не використовуються.

### Task 9: Setup Clerk middleware

`src/middleware.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/p/(.*)',      // proposal (tokenized)
  '/g/(.*)',      // guest portal (tokenized)
  '/api/webhooks/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Task 10: Structure папок features/

Створити каркас (порожні файли з коментарями):

```
src/features/
├── inquiries/
│   ├── components/.gitkeep
│   ├── actions/.gitkeep
│   └── schemas/.gitkeep
├── orders/
│   ├── components/.gitkeep
│   ├── actions/.gitkeep
│   └── schemas/.gitkeep
├── guests/
│   ├── components/.gitkeep
│   ├── actions/.gitkeep
│   └── schemas/.gitkeep
└── payments/
    ├── components/.gitkeep
    ├── actions/.gitkeep
    └── pricing/.gitkeep
```

### Task 11: Seed Data

Створи `prisma/seed.ts`:

```typescript
// Seed: 4 готелі RUTA + 3 типових тарифи + admin user
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')
  
  // Properties
  const polyana = await prisma.property.upsert({
    where: { slug: 'ruta-polyana' },
    create: {
      name: 'Ruta Resort Polyana',
      slug: 'ruta-polyana',
      address: 'Поляна, Закарпатська область',
      description: 'Гірський all-inclusive курорт у Карпатах',
      amenities: { spa: true, pool: true, skiRental: true, kidsClub: true },
    },
    update: {},
  })
  
  const polianytsia = await prisma.property.upsert({
    where: { slug: 'ruta-polianytsia' },
    create: {
      name: 'Ruta Resort Polianytsia',
      slug: 'ruta-polianytsia',
      address: 'Поляниця (Буковель), Івано-Франківська область',
      description: 'Бутік-готель біля Буковеля',
      amenities: { spa: true, skiRental: true },
    },
    update: {},
  })
  
  const zatoka = await prisma.property.upsert({
    where: { slug: 'ruta-zatoka' },
    create: {
      name: 'Ruta Resort Zatoka',
      slug: 'ruta-zatoka',
      address: 'Затока, Одеська область',
      description: 'Морський курорт',
      amenities: { beach: true, pool: true },
    },
    update: {},
  })
  
  // Sample Rooms for Polyana
  const roomTypes = ['STANDARD', 'FAMILY', 'DELUXE', 'SUITE'] as const
  for (let i = 1; i <= 20; i++) {
    const type = roomTypes[i % 4]
    await prisma.room.upsert({
      where: { propertyId_number: { propertyId: polyana.id, number: `A-${100 + i}` } },
      create: {
        propertyId: polyana.id,
        number: `A-${100 + i}`,
        type,
        capacity: type === 'FAMILY' ? 4 : type === 'SUITE' ? 2 : 2,
      },
      update: {},
    })
  }
  
  // Sample Tariff
  await prisma.tariff.create({
    data: {
      propertyId: polyana.id,
      name: 'Стандарт квітень 2026',
      roomType: 'FAMILY',
      pricePerNight: 5500,
      currency: 'UAH',
      mealPlan: 'HALF_BOARD',
      validFrom: new Date('2026-04-01'),
      validTo: new Date('2026-04-30'),
      minNights: 2,
      minGuests: 1,
      maxGuests: 4,
      prepayRule: { NEW: 50, FRIEND: 30, FAMILY: 30, VIP: 20 },
    },
  })
  
  console.log('Seeded 3 properties, 20 rooms, 1 tariff.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Додай в `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Install `tsx`: `pnpm add -D tsx`

Запусти seed: `pnpm prisma db seed`

### Task 12: Health check page

Створи `src/app/(dashboard)/today/page.tsx` — placeholder:

```typescript
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function TodayPage() {
  const user = await getCurrentUser()
  
  const stats = await prisma.$transaction([
    prisma.property.count(),
    prisma.room.count(),
    prisma.tariff.count(),
  ])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Сьогодні</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-lg border">
          <div className="text-sm text-muted-foreground">Готелі</div>
          <div className="text-3xl font-bold">{stats[0]}</div>
        </div>
        <div className="p-6 rounded-lg border">
          <div className="text-sm text-muted-foreground">Номери</div>
          <div className="text-3xl font-bold">{stats[1]}</div>
        </div>
        <div className="p-6 rounded-lg border">
          <div className="text-sm text-muted-foreground">Тарифи</div>
          <div className="text-3xl font-bold">{stats[2]}</div>
        </div>
      </div>
      
      <div className="mt-8 p-4 rounded-lg bg-muted">
        <h2 className="font-semibold mb-2">Your info</h2>
        <p className="text-sm">User: {user?.email ?? 'not signed in'}</p>
        <p className="text-sm">Role: {user?.role ?? '—'}</p>
      </div>
    </div>
  )
}
```

### Task 13: Verify everything works

Check list:
1. `pnpm dev` — сервер стартує без помилок
2. Відкрий `http://localhost:3000` — redirect до `/sign-in`
3. Зареєструйся через Clerk → редірект до `/today`
4. Бачиш 3 готелі, 20 номерів, 1 тариф
5. Після першого sign-in — `User` record в Prisma (`pnpm prisma studio`)

### Task 14: Commit

```bash
git add -A
git commit -m "Phase 1 setup: Prisma schema, Clerk auth, RBAC, seed data"
```

---

## ⚠ Rules for This Session

1. **НЕ імплементуй UI для Чатів, Замовлень, Замовлень** — це наступна сесія
2. **НЕ додавай AI** — Phase 5
3. **НЕ додавай tests** — Phase 5+
4. **НЕ створюй webhooks** — наступна сесія
5. **Prisma schema** — тільки Phase 1 моделі, решта deferred
6. **Завжди** використовуй `prisma.$transaction` для multi-step ops
7. **Завжди** валідуй input через Zod у server actions (коли будуть)
8. **Коли сумніваєшся** — дотримуйся 26 principles з CLAUDE.md

---

## ✅ Success Criteria

- [x] Kiranism template cloned + configured
- [x] Dependencies installed (pnpm)
- [x] `.env.local` з усіма ключами (DATABASE_URL, CLERK_*, ENCRYPTION_KEY)
- [x] Prisma schema з Phase 1 моделями
- [x] Initial migration пройшла (`pnpm prisma migrate dev`)
- [x] `lib/prisma.ts` + `lib/encryption.ts` + `lib/auth.ts` створені
- [x] Clerk middleware працює (public vs protected routes)
- [x] Seed data: 3 готелі, 20 номерів, 1 тариф
- [x] `/today` рендериться зі статистикою
- [x] Clerk sign-up створює `User` в Prisma
- [x] Git commit зроблено

---

## 🎬 Після успішної Setup сесії

Напиши коротке summary:
- Скільки файлів створено
- Скільки моделей у Prisma
- Які dependencies встановлено
- URL dev сервера
- Що готово протестувати

І питай Сергія: "Ready to start Task 1 — Telegram webhook + Inquiry creation?"

---

**Кінець Phase 1 Setup Prompt. Поїхали! 🚀**
