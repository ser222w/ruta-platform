# CHAT A — Acquisition Flow (Full MVP)
# Вставити цілком у новий чат Claude Code в директорії ruta-platform/

---

## ВАЖЛИВО: який CLAUDE.md читати

Читай `CLAUDE.md` (корінь ruta-platform/) — це актуальний файл.
НЕ читай `docs/CLAUDE.md` — він застарів (інший стек, ігноруй).

---

## Режим роботи (ОБОВ'ЯЗКОВО)

### Фаза 1 — Дослідження + План (AUTO-EXECUTE, без зупинок)
1. Читай CLAUDE.md, spec docs, існуючий код — автоматично, без питань
2. Перевір `prisma/schema/` — знайди що вже є, щоб не дублювати
3. Склади ПЛАН у форматі:
   ```
   ## ПЛАН: [назва]
   Мета: | Файли (нові/змінені): | Кроки: | Ризики:
   ```
4. **СТОП → Покажи план → Чекай підтвердження Сергія**

### Фаза 2 — Виконання (після апруву плану)
- Виконуй автономно до кінця без зупинок
- Коміт після кожного логічного блоку
- Якщо щось незрозуміло — вирішуй сам за PRINCIPLES.md

### Фаза 3 — Тестування (AUTO-EXECUTE після кожного блоку)
```bash
# Після кожного нового файлу/фічі:
bun run typecheck    # 0 errors — не продовжуй якщо є помилки
bun run lint         # 0 warnings

# Після завершення всього scope:
bun run test         # існуючі тести зелені
bun run test:e2e     # Playwright e2e тести
```

**E2E тести (Playwright) — написати в `tests/e2e/acquisition.spec.ts`:**
```typescript
// Тест 1: Менеджер створює Inquiry вручну
test('manager creates inquiry manually', async ({ page }) => {
  await page.goto('/today')
  await page.click('text=Нове звернення')
  await page.fill('[name=phone]', '+380671234567')
  await page.fill('[name=firstName]', 'Тест')
  await page.click('button[type=submit]')
  await expect(page.locator('text=Тест')).toBeVisible()
})

// Тест 2: Inquiry → Booking → Payment link (повний шлях)
test('full acquisition flow', async ({ page }) => {
  // login → open inquiry → create booking → send payment link
  // verify portal page opens without auth
})

// Тест 3: Guest portal без авторизації
test('guest portal loads without auth', async ({ page }) => {
  // Direct URL /portal/booking/[test-token]
  // Verify: hotel name, dates, amount visible
  // Verify: LiqPay form present
})
```

**Правило:** НЕ пиши "має працювати" або "done" без зелених тестів. Якщо тест падає — fix → retest → тільки потім commit.

---

## Контекст сесії

Ти Senior Full-Stack TypeScript Developer, будуєш RUTA OS — операційну платформу для мережі готелів.

**Прочитай перед початком (обов'язково):**
1. `CLAUDE.md` — стек, конвенції, бізнес-правила, UX принципи, термінологія
2. `docs/RUTA_CRM_IMPLEMENTATION_v2_7.md` — повна імплементаційна специфікація
3. `docs/RUTA_CRM_v2_5_MASTER.md` Частини 1, 2, 6, 8 — філософія, термінологія, user journeys
4. `CHANGELOG.md` — що вже зроблено (Tasks 1-6)

**Поточний стан проекту:**
- ✅ Task 1-6 виконано: Foundation + Prisma schema (38 таблиць) + CASL RBAC + CRM Pipeline UI
- ✅ Deploy: app.ruta.cam живий
- ✅ Існуючі routers: `src/server/trpc/routers/crm.ts`, `health.ts`
- ✅ Існуючий Hono: `src/server/hono/app.ts`
- 🔜 **TASK цієї сесії:** Acquisition Flow — повний шлях від Inquiry до оплати

---

## Ціль сесії

**Менеджер приймає звернення → відкриває одну картку → за ≤90 секунд гість отримує посилання на оплату.**

Метрики успіху:
- ≤5 кліків менеджера від відкриття чату до надсилання посилання
- Час від inquiry до payment link: <2 хвилин
- 0 ручного введення даних якщо гість вже є в системі

---

## Scope цієї сесії (НЕ відходити від нього)

### Що будуємо:

**1. Prisma schema additions** (нові моделі якщо ще не існують)
- `Inquiry` — вхідне звернення (source, status, guestId, assignedTo, nextAction)
- `Task` — задача з deadline (type, title, assignedTo, dueAt, status, bookingId)
- Перевір `prisma/schema/` — можливо вже є, не дублюй

**2. tRPC routers** (нові файли в `src/server/trpc/routers/`)
- `inquiry.ts` — `list`, `getById`, `create`, `updateStatus`, `convertToBooking`
- `booking.ts` — `create`, `getById`, `updateStage`, `calculatePrice`, `generatePaymentSchedule`
- `task.ts` — `list`, `create`, `complete`, `getMyQueue`
- Підключити в `src/server/trpc/root.ts`

**3. Pricing engine** (`src/server/services/pricing/`)
- `calculate-rate.ts` — головний orchestrator
- `find-best-promo.ts` — алгоритм вибору найкращої акції
- `apply-certificate.ts` — логіка сертифіката
- `generate-schedule.ts` — генерація PaymentSchedule

**Бізнес-правила pricing (з CLAUDE.md):**
```
BAR × ночі → accommodation_total
+ meal_plan → meal_total
+ services → services_total
= SUBTOTAL
- manager_discount (якщо > 10% → блокер)
= FINAL_TOTAL
- certificate_amount → payment_due (min 0)
× prepay_pct (NEW=50%, FRIEND=30%, FAMILY=30%, VIP=20%) → prepay_amount
= balance_amount
```

**Promo selection:** фільтр по property/roomType/dates/minNights/channel/segment → найвигідніша для гостя → при рівній ціні вищий priority → при рівному priority старіша (createdAt ASC). Акції НЕ комбінуються (якщо isStackable != true).

**4. Portal token generation** (`src/server/services/portal.ts`)
- `generatePortalToken(bookingId)` — unique UUID, expires 72h
- Записує `booking.portalToken` + `booking.tokenExpiresAt`

**5. Public guest portal** (`src/app/portal/booking/[token]/page.tsx`)
- Без авторизації (public route)
- Відображає: готель, дати, номер, гості, сума, breakdown цін
- Embed LiqPay form (через `src/server/services/liqpay.ts`)
- Mobile-first design (гість платить з телефону)

**6. LiqPay webhook** (`src/server/hono/webhooks/liqpay.ts`)
- Verify signature: `base64(sha1(privateKey + data + privateKey))`
- Ідемпотентно: перевір `payment.externalId` перед обробкою
- При success: `booking.stage = PREPAYMENT`, `payment.status = SUCCEEDED`
- Auto-assign Farmer: знайти user з роллю FARMER → `booking.farmerId = farmer.id`
- Create Activity: `type=HANDOFF, note="Автоматична передача після передоплати"`

**7. UI pages** (`src/app/(dashboard)/`)
- `/today/page.tsx` — черга менеджера (Inquiry list + Task queue + EOD progress)
- `/inquiries/page.tsx` — список звернень з фільтрами
- `/inquiries/[id]/page.tsx` або Sheet — картка звернення + кнопка "Створити замовлення"
- `/bookings/[id]/page.tsx` — картка замовлення: 5 вкладок (Запит, Нарахування, Оплати, Задачі, Журнал)
- Кнопка "Надіслати посилання на оплату" → відкриває Confirm dialog → надсилає (placeholder, реальний WhatsApp в Chat C)

**8. Sidebar navigation** — додати пункти Inquiries, Today, Bookings якщо ще не є

---

## НЕ робити в цій сесії

- ❌ WhatsApp/Telegram відправка (Chat C)
- ❌ Ringostat webhook (Chat B)
- ❌ Farmer retention flow (Chat E)
- ❌ BI dashboards (Chat D)
- ❌ AI-assisted drafts (Phase 5)
- ❌ SMS/Email integration (later)

---

## Конвенції (обов'язково дотримуватись)

```typescript
// Server Action pattern:
'use server'
const user = await requirePermission('BOOKINGS_WRITE')
const input = BookingCreateSchema.parse(rawInput)
const result = await prisma.$transaction(async (tx) => { ... })
revalidatePath('/bookings')
return { success: true, data: result }

// Error handling:
throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' })

// Dates:
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
format(date, 'dd.MM.yyyy', { locale: uk })

// Forms: react-hook-form + zod + Shadcn Form components
// URL state: nuqs (searchParamsCache server, useQueryStates client)
// Toast: Sonner (success green 2s, error red + Retry)
// Loading: Skeleton not Spinner for page-level
```

---

## Verification (запусти перед commit)

```bash
bun run typecheck       # 0 errors
bun run lint            # 0 warnings
bun run test            # existing tests still pass
```

Перевір вручну:
1. `/today` відкривається, показує список inquiries і tasks
2. Натиснути "Нове звернення" → форма → зберегти → з'являється в списку
3. Відкрити звернення → "Створити замовлення" → форма з розрахунком ціни
4. Натиснути "Надіслати посилання" → з'являється confirm dialog
5. `/portal/booking/[token]` відкривається без авторизації

---

## Commit після завершення

```bash
git add -A
git commit -m "feat: acquisition flow — inquiry→booking→pricing→payment portal"
```

---

**Починай з читання CLAUDE.md та RUTA_CRM_IMPLEMENTATION_v2_7.md. Потім перевір існуючу схему (`prisma/schema/`) щоб не дублювати моделі. Потім — план → очікуй підтвердження → execute.**

---

## Тестування + Auto-Healing (після кожного блоку коду)

### Цикл (виконуй автономно, без питань)
```
НАПИСАВ КОД → typecheck → lint → unit tests → e2e tests → commit
         ↑_______fix (max 3 спроби на кожен рівень)_______↑
```

**Якщо на будь-якому кроці помилка:**
1. Читай error повністю
2. Знайди root cause (не патч симптом)
3. Fix → rerun → якщо знову падає → ще раз
4. Після 3 невдалих спроб → зупинись, опиши Сергію що саме не виходить і чому

**Auto-healing по типу помилки:**
- TypeScript `Type X not assignable` → виправ тип, ніколи `as any`
- `Cannot find module` → перевір `@/` аліас і prisma generate
- Unit test failed → виправ логіку, не expected value
- E2E `element not found` → додай `data-testid` до компонента
- E2E `timeout` → перевір що endpoint існує, читай server logs
- `bun run build` failed → обов'язково fix перед push (dev != prod)

**Playwright setup** (якщо немає):
```bash
bun add -D @playwright/test && bunx playwright install chromium
```

`playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: { command: 'bun run dev', port: 3000, reuseExistingServer: true },
})
```

`tests/e2e/helpers.ts`:
```typescript
import { Page } from '@playwright/test'
export async function loginAs(page: Page, email: string, password = 'Test1234!') {
  await page.goto('/sign-in')
  await page.fill('[name=email]', email)
  await page.fill('[name=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/(today|crm|inbox)/, { timeout: 10_000 })
}
export const loginAsAdmin  = (p: Page) => loginAs(p, 'admin@ruta.cam')
export const loginAsCloser = (p: Page) => loginAs(p, 'closer@ruta.cam')
export const loginAsFarmer = (p: Page) => loginAs(p, 'farmer@ruta.cam')

// Note: test users created by prisma/seed.ts with password 'Test1234!'
// Run `bun prisma db seed` before e2e tests
```

---

## Документування + Деплой (в кінці сесії, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md — секція CURRENT STATUS
Додай `✅ Chat A: Acquisition Flow — [дата]` + нові ключові файли + нові ENV vars

### 2. Оновити CHANGELOG.md
```markdown
## [0.7.0] — YYYY-MM-DD — Chat A: Acquisition Flow

### Added
- Inquiry creation flow (manual + from chat)
- Booking creation with pricing engine (3-layer: BAR → Promo → Certificate)
- PaymentSchedule auto-generation (NEW=50%, FRIEND=30%, FAMILY=30%, VIP=20%)
- Guest portal /portal/booking/[token] (public, mobile-first)
- LiqPay payment embed + webhook handler
- Auto-assign Farmer on PREPAYMENT stage
- /today page: inquiry queue + task queue + EOD progress
- /inquiries and /bookings pages

### Technical
- New tRPC routers: inquiry, booking, task
- New services: pricing/, portal.ts, liqpay.ts
- New Hono webhook: /api/webhooks/liqpay
- New Prisma models: Inquiry, Task (if not existed)
- E2E tests: tests/e2e/acquisition.spec.ts
```

### 3. Фінальна перевірка
```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

### 4. Commit (push після підтвердження Сергія)
```bash
git add -A && git status
git commit -m "feat: acquisition flow — inquiry→booking→pricing→payment portal"
# НЕ пушити main автоматично — спершу покажи фінальний звіт Сергію
```

### 5. Smoke-test prod після деплою (~5 хв)
- app.ruta.cam → /today відкривається
- Нове звернення → форма → зберігається
- Замовлення → розрахунок ціни → посилання оплати генерується
- /portal/booking/[token] відкривається без авторизації

### 6. Фінальний звіт у чат
```
✅ Chat A: Acquisition Flow завершено

Зроблено: [перелік]
Тести: unit [N/N] ✅  e2e [N/N] ✅
Build: ✅ production
Deploy: app.ruta.cam ✅

Наступний крок: Chat B (Ringostat) + Chat C (Inbox) + Chat D (BI) паралельно
```
