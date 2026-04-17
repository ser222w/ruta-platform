# CHAT E — Farmer Retention Flow
# Запускати ПІСЛЯ завершення Chat A (і бажано Chat B для SSE)
# Вставити цілком у новий чат Claude Code в директорії ruta-platform/

---

## Режим роботи (ОБОВ'ЯЗКОВО)

### Фаза 1 — Дослідження + План (AUTO-EXECUTE)
1. Читай CLAUDE.md (Guest Lifecycle + Business Rules), v2.6 Addendum Частина A — автоматично
2. Перевір: booking router (updateStage), Task model в schema, Certificate model
3. Склади ПЛАН: post-checkout функція, cron jobs, Farmer UI, WrapUp form
4. **СТОП → Покажи план → Чекай апруву**

### Фаза 2 — Виконання (після апруву, автономно до кінця)

### Фаза 3 — Тестування (після кожного блоку)
```bash
bun run typecheck && bun run lint
bun run test         # unit тести для computeSegment і post-checkout logic
bun run test:e2e
```

**Unit тести (`tests/unit/retention.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest'
import { computeSegment } from '@/server/services/retention'

describe('computeSegment', () => {
  it('returns NEW for 0 visits', () => expect(computeSegment(0)).toBe('NEW'))
  it('returns FRIEND for 1-4 visits', () => {
    expect(computeSegment(1)).toBe('FRIEND')
    expect(computeSegment(4)).toBe('FRIEND')
  })
  it('returns FAMILY for 5-9 visits', () => {
    expect(computeSegment(5)).toBe('FAMILY')
    expect(computeSegment(9)).toBe('FAMILY')
  })
  it('returns VIP for 10+ visits', () => expect(computeSegment(10)).toBe('VIP'))
})

describe('post-checkout automation', () => {
  it('issues certificate on 3rd visit', async () => { ... })
  it('issues certificate on 5th visit', async () => { ... })
  it('creates post-stay task due in 2 days', async () => { ... })
  it('increments visitCount correctly', async () => { ... })
})
```

**E2E тести (`tests/e2e/farmer.spec.ts`):**
```typescript
// Тест 1: CHECKOUT запускає automation
test('checkout stage triggers post-checkout automation', async ({ page, request }) => {
  await loginAsAdmin(page)
  // Move booking to CHECKOUT via tRPC
  // Verify: guest.visitCount++, Task created, Certificate if 3rd/5th
})

// Тест 2: Farmer бачить Task queue на /today
test('farmer sees task queue on today page', async ({ page }) => {
  await loginAs(page, 'farmer@ruta.cam')
  await page.goto('/today')
  await expect(page.locator('[data-testid=task-queue]')).toBeVisible()
})

// Тест 3: WrapUp форма є обов'язковою
test('task completion requires wrap-up form', async ({ page }) => {
  await loginAs(page, 'farmer@ruta.cam')
  // Open task
  await page.click('[data-testid=task-complete-btn]')
  // Verify WrapUp form appears
  await expect(page.locator('[data-testid=wrapup-form]')).toBeVisible()
  // Try submit without summary
  await page.click('button[type=submit]')
  // Verify error (min 10 words)
  await expect(page.locator('text=Мінімум 10 слів')).toBeVisible()
})

// Тест 4: Winback cron endpoint
test('winback cron creates tasks for dormant guests', async ({ request }) => {
  const response = await request.get('/api/cron/winback', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  })
  expect(response.status()).toBe(200)
  const data = await response.json()
  expect(typeof data.processed).toBe('number')
})
```

---

## Контекст сесії

Ти Senior Full-Stack TypeScript Developer, будуєш RUTA OS.

**Прочитай перед початком:**
1. `CLAUDE.md` — стек, конвенції, бізнес-правила (секції: Guest Lifecycle, Business Rules)
2. `docs/RUTA_CRM_v2_6_ADDENDUM.md` — Частина A: Шлях В повний (Farmer-driven)
3. `CHANGELOG.md` — що вже зроблено

**Поточний стан:** Chat A виконано — є Booking pipeline, PaymentSchedule, stage transitions. Ця сесія — автоматизація після виїзду + Farmer UI.

---

## Ціль сесії

**Гість виїжджає → система автоматично запускає retention sequence → Farmer веде гостя до наступного візиту без ручного відстеження.**

---

## Scope

### 1. Post-checkout automation (`src/server/services/retention.ts`)

Функція що викликається при `booking.stage = CHECKOUT`:

```typescript
export async function runPostCheckoutAutomation(
  bookingId: string,
  tx: PrismaTransactionClient
): Promise<void> {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { guest: true, assignedFarmer: true }
  })

  // 1. Update visitCount + LTV
  const newVisitCount = booking.guest.visitCount + 1
  const totalPayments = await tx.payment.aggregate({
    where: { bookingId, status: 'SUCCEEDED' },
    _sum: { amount: true }
  })
  const newLtv = booking.guest.ltv + (totalPayments._sum.amount ?? 0)

  // 2. Recalculate segment
  const newSegment = computeSegment(newVisitCount)

  // 3. Update guest
  await tx.guestProfile.update({
    where: { id: booking.guest.id },
    data: {
      visitCount: newVisitCount,
      ltv: newLtv,
      loyaltyTier: newSegment,
      lastStayDate: booking.checkOut,
    }
  })

  // 4. Auto-issue certificate
  if (newVisitCount === 3) {
    await issueCertificate(tx, booking.guest.id, 6000, 'FAMILY_3RD_VISIT')
  }
  if (newVisitCount === 5) {
    await issueCertificate(tx, booking.guest.id, 10000, 'VIP_5TH_VISIT')
  }

  // 5. Create post-stay Task for Farmer (T+2)
  const dueAt = addDays(new Date(), 2)
  await tx.task.create({
    data: {
      type: 'POST_STAY_CALL',
      title: `Послідовний дзвінок — ${booking.guest.firstName}`,
      assignedToId: booking.assignedFarmerId ?? booking.assignedCloserId,
      bookingId,
      guestId: booking.guest.id,
      dueAt,
      status: 'PENDING',
    }
  })

  // 6. AuditLog
  await tx.auditLog.create({
    data: {
      entityType: 'Booking',
      entityId: bookingId,
      action: 'POST_CHECKOUT_AUTOMATION',
      changes: { newVisitCount, newSegment, certificate: newVisitCount === 3 || newVisitCount === 5 }
    }
  })
}

function computeSegment(visitCount: number): LoyaltyTier {
  if (visitCount === 0) return 'NEW'
  if (visitCount < 5) return 'FRIEND'
  if (visitCount < 10) return 'FAMILY'
  return 'VIP'
}

async function issueCertificate(
  tx: PrismaTransactionClient,
  guestId: string,
  amount: number,
  source: string
): Promise<void> {
  await tx.certificate.create({
    data: {
      guestId,
      amount,
      source,
      status: 'ACTIVE',
      expiresAt: addMonths(new Date(), 6),
    }
  })
}
```

**Підключити** в `src/server/trpc/routers/booking.ts` — в `updateStage` mutation, коли `newStage === 'CHECKOUT'`:
```typescript
await runPostCheckoutAutomation(bookingId, tx)
```

### 2. Cron jobs (`src/app/api/cron/`)

**Winback cron** (`src/app/api/cron/winback/route.ts`):
```typescript
// Запускати щодня о 09:00
// Знаходить гостей що не мали активності > 6 місяців
// Створює Task для Farmer

export async function GET(request: Request) {
  verifySecret(request)
  
  const sixMonthsAgo = subMonths(new Date(), 6)
  
  const dormantGuests = await prisma.guestProfile.findMany({
    where: {
      lastStayDate: { lt: sixMonthsAgo },
      loyaltyTier: { in: ['FRIEND', 'FAMILY', 'VIP'] },
      // No open winback task already
      tasks: { none: { type: 'WINBACK', status: 'PENDING' } }
    },
    include: { assignedFarmer: true }
  })

  for (const guest of dormantGuests) {
    await prisma.task.create({
      data: {
        type: 'WINBACK',
        title: `Winback — ${guest.firstName} (${monthsSince(guest.lastStayDate)} міс без заїзду)`,
        assignedToId: guest.assignedFarmerId,
        guestId: guest.id,
        dueAt: addDays(new Date(), 1),
        status: 'PENDING',
        priority: guest.loyaltyTier === 'VIP' ? 'HIGH' : 'NORMAL',
      }
    })
  }

  return Response.json({ processed: dormantGuests.length })
}
```

**Birthday cron** (`src/app/api/cron/birthday/route.ts`):
```typescript
// Запускати щодня о 08:00
// Видає сертифікат ₴3,000 на день народження

export async function GET(request: Request) {
  verifySecret(request)
  
  const today = new Date()
  const todayMMDD = format(today, 'MM-dd')
  
  const birthdayGuests = await prisma.guestProfile.findMany({
    where: {
      birthDate: { not: null },
      // Мatch MM-DD частину
    }
  })
  
  // Filter in JS (Prisma не підтримує MM-DD extraction нативно):
  const todayBirthdays = birthdayGuests.filter(g => 
    g.birthDate && format(g.birthDate, 'MM-dd') === todayMMDD
  )
  
  for (const guest of todayBirthdays) {
    await issueCertificate(guest.id, 3000, 'BIRTHDAY_GIFT')
    // TODO: Send Telegram congratulations (Chat C)
  }
  
  return Response.json({ processed: todayBirthdays.length })
}
```

**EOD Summary cron** (`src/app/api/cron/eod-summary/route.ts`):
```typescript
// Запускати щодня о 20:00
// Надсилає Telegram CEO зведення дня

export async function GET(request: Request) {
  verifySecret(request)
  
  const today = { gte: startOfDay(new Date()), lte: endOfDay(new Date()) }
  
  const [newInquiries, paidBookings, revenue, overdueCount] = await prisma.$transaction([
    prisma.inquiry.count({ where: { createdAt: today } }),
    prisma.booking.count({ where: { stage: 'PREPAYMENT', updatedAt: today } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED', createdAt: today }, _sum: { amount: true } }),
    prisma.paymentScheduleLine.count({ where: { status: 'PENDING', dueAt: { lt: new Date() } } }),
  ])

  const message = `📊 Підсумок дня ${format(new Date(), 'dd.MM.yyyy')}
  
💬 Нових звернень: ${newInquiries}
💳 Оплачено: ${paidBookings} бронювань
💰 Revenue сьогодні: ₴${formatNumber(revenue._sum.amount ?? 0)}
⚠️ Прострочених оплат: ${overdueCount}`

  // await sendTelegramMessage(process.env.CEO_TELEGRAM_CHAT_ID!, message)
  // (коли Chat C буде готовий)
  
  return Response.json({ sent: true, message })
}
```

**Налаштування cron у Coolify** (або GitHub Actions):
```yaml
# .github/workflows/cron.yml
on:
  schedule:
    - cron: '0 8 * * *'   # birthday 08:00 UTC
    - cron: '0 9 * * *'   # winback 09:00 UTC
    - cron: '0 17 * * *'  # eod 20:00 Kyiv = 17:00 UTC
```

Або через Coolify Cron Jobs (preferred — не потрібен GitHub Actions).

### 3. Farmer UI — Task Queue (`/today` для FARMER role)

Farmer бачить інший Today ніж Closer. Контролюй через `ctx.user.role`:

```
┌─────────────────────────────────────────────────────┐
│ Сьогодні — Farmer view                              │
│                                                     │
│ ── Черга задач (5) ───────────────────────────     │
│ 🔴 Послідовний дзвінок — Olena K.    ПРОСТРОЧЕНО   │
│    Заїзд: 15 квіт · LTV ₴42k        [Відкрити →]  │
│                                                     │
│ 🟡 Winback — Ivan P.                 сьогодні      │
│    18 міс без заїзду · FAMILY        [Відкрити →]  │
│                                                     │
│ ⚪ Сезонний тригер — Mariia G.       завтра        │
│    Літо → Зима пропозиція            [Відкрити →]  │
└─────────────────────────────────────────────────────┘
```

**Task list query для Farmer:**
```typescript
const myTasks = await prisma.task.findMany({
  where: {
    assignedToId: userId,
    status: { in: ['PENDING', 'IN_PROGRESS'] },
  },
  include: {
    guest: { select: { firstName: true, lastName: true, loyaltyTier: true, ltv: true } },
    booking: { select: { id: true, checkIn: true, checkOut: true } },
  },
  orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }]
})
```

### 4. Guest 360 view (`/guests/[id]/page.tsx`)

Farmer відкриває гостя і бачить повну картину:

**Tabs:**
1. **Профіль** — контакти, сегмент, preferences, birthday, certificates
2. **Історія заїздів** — всі Bookings з датами, сумами, готелем
3. **Задачі** — Task history (виконані + активні)
4. **Нотатки** — AuditLog entries з коментарями менеджерів

**Certificates widget:**
```
🎫 Сертифікати
Active: ₴6,000 · діє до 15.10.2026 (FAMILY)
Used: ₴3,000 · використано 05.03.2026 (BIRTHDAY)
```

### 5. Wrap-up form component (`src/components/shared/wrap-up-form.tsx`)

Mandatory форма після кожного Task виконання:

```typescript
interface WrapUpFormProps {
  taskId: string
  taskType: TaskType
  onComplete: () => void
}

// Fields:
// - summary: string (min 10 words, textarea)
// - result: 'CONTINUE' | 'WARM_UP' | 'UNQUALIFIED' (radio)
// - nextTouchpoint: 'WEEK' | 'MONTH' | 'QUARTER' | 'SEASONAL' (select)
// - notes: string (optional, textarea)

// On submit:
// 1. task.status = COMPLETED, task.wrapUpSummary = summary
// 2. Create next Task based on result + nextTouchpoint
// 3. Update guest.preferences if notes
// 4. AuditLog
```

**Правила auto-create наступної задачі:**
```
result=CONTINUE + nextTouchpoint=WEEK → Task "Надіслати пропозицію" в +7 днів
result=CONTINUE + nextTouchpoint=MONTH → Task "Нагадати" в +30 днів
result=WARM_UP + nextTouchpoint=QUARTER → Task "Сезонний тригер" в +90 днів
result=UNQUALIFIED → Task "Winback check" в +180 днів
```

---

## НЕ робити в цій сесії

- ❌ Email/WhatsApp відправка з retention tasks (підключити потім з Chat C)
- ❌ NPS survey form (Phase 3)
- ❌ Certificate PDF generation
- ❌ Campaign broadcast (Phase 3)

---

## Verification

```bash
bun run typecheck && bun run test

# Перевір post-checkout automation:
# 1. Знайди booking в стадії CHECKIN в Prisma Studio
# 2. Через tRPC updateStage → CHECKOUT
# 3. Перевір: guest.visitCount++, task з'явилась, certificate якщо 3rd/5th visit
```

Перевір вручну:
1. `/today` для FARMER role — показує Task queue
2. Виконати Task → з'являється WrapUpForm
3. Заповнити → submit → наступна Task auto-created
4. `/guests/[id]` — показує 4 вкладки з реальними даними

---

---

## Тестування + Auto-Healing (після кожного блоку)

```
КОД → typecheck → lint → unit tests (retention logic!) → e2e → commit
    ↑___________fix (max 3 спроби)_______________________________↑
```

**Auto-healing:**
- `computeSegment` unit test fails → перевір граничні значення (рівно 5, рівно 10)
- Certificate не видається → перевір що `runPostCheckoutAutomation` викликається в `updateStage`
- Cron 401 → перевір `verifySecret` function і CRON_SECRET env var
- WrapUp форма не блокує submit → перевір min words validation (zod `.refine()`)
- Task не створюється після WrapUp → перевір `result` field mapping до Task type
- Після 3 спроб → зупинись, опиши

**Критичні unit тести (НЕ пропускати):**
```bash
bun run test tests/unit/retention.test.ts
# Всі 8 тестів мають бути зелені перед commit
```

---

## Документування + Деплой (в кінці, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md — CURRENT STATUS
`✅ Chat E: Farmer Retention — [дата]`

### 2. Оновити CHANGELOG.md
```markdown
## [0.11.0] — YYYY-MM-DD — Chat E: Farmer Retention

### Added
- Post-checkout automation: visitCount++, segment recalc, certificate issuance
- Auto-task creation: "Послідовний дзвінок" (T+2 after checkout)
- Certificate auto-issue: ₴6,000 on 3rd visit, ₴10,000 on 5th visit
- Cron jobs: /api/cron/winback (daily), /api/cron/birthday (daily), /api/cron/eod-summary (daily)
- Farmer Today view: task queue sorted by priority + due date
- Guest 360 view: 4 tabs (Profile, Stay History, Tasks, Notes)
- WrapUpForm: mandatory after task completion, min 10 words, auto-creates next task
- Winback: auto-task for guests inactive > 6 months

### Technical
- New: src/server/services/retention.ts
- New: src/app/api/cron/ (winback, birthday, eod-summary)
- New: src/components/shared/wrap-up-form.tsx
- Unit tests: tests/unit/retention.test.ts (8 tests)
- E2E tests: tests/e2e/farmer.spec.ts
```

### 3. Фінальна перевірка
```bash
bun run typecheck && bun run lint
bun run test                           # unit + integration
bun run test tests/unit/retention.test.ts  # критичні тести окремо
bun run test:e2e
bun run build
```

### 4. Commit + Push
```bash
git add -A && git status
git commit -m "feat: farmer retention — post-checkout automation, cron jobs, task queue, wrap-up"
git push origin main
```

### 5. Smoke-test prod
- Перевести тестове бронювання в CHECKOUT через /bookings
- Перевірити в Prisma Studio: guest.visitCount++, Task створена, Certificate якщо 3/5
- /today як farmer@ruta.cam → Task видно
- Виконати Task → WrapUp form → наступна Task auto-created

### 6. Фінальний звіт
```
✅ Chat E: Farmer Retention завершено
Тести: unit [8/8] ✅  e2e [N/N] ✅
Deploy: app.ruta.cam ✅

🎉 MVP Acquisition + Retention Flow повністю готовий
Наступне: Ringostat prod налаштування / KeyCRM міграція / NPS survey
```
