# CHAT D — BI Dashboards (Tremor Raw)
# Запускати ПАРАЛЕЛЬНО з Chat B і Chat C після завершення Chat A
# Найбезпечніший чат — тільки читає з DB, нічого не пише
# Вставити цілком у новий чат Claude Code в директорії ruta-platform/
# ФІНАЛЬНА ФАЗА: виконай docs/ops.md "Chat Completion Checklist" (typecheck→lint→test→e2e→docs→commit→push→deploy verify)

---

## Режим роботи (ОБОВ'ЯЗКОВО)

### Фаза 1 — Дослідження + План (AUTO-EXECUTE)
1. Читай CLAUDE.md — секції KPI, ролі, sidebar RBAC — автоматично
2. Перевір існуючий `/today/page.tsx`, `/planning/`, `/payments/` — що вже є
3. Перевір доступні дані в DB через Prisma Studio або тестовий query
4. Склади ПЛАН: які сторінки, які компоненти, які SQL queries
5. **СТОП → Покажи план → Чекай апруву**

### Фаза 2 — Виконання (після апруву, автономно)

### Фаза 3 — Тестування (після кожного блоку)
```bash
bun run typecheck && bun run lint

# Performance перевірка — кожен dashboard query < 500ms:
# Відкрий Network tab в браузері → refresh /planning
# Кожен tRPC call має бути < 500ms
# Якщо > 500ms → додай DB index або оптимізуй query

bun run test:e2e
```

**E2E тести (`tests/e2e/dashboards.spec.ts`):**
```typescript
// Тест 1: REVENUE_MANAGER бачить planning dashboard
test('revenue manager sees planning KPIs', async ({ page }) => {
  await loginAs(page, 'revenue@ruta.cam')
  await page.goto('/planning')
  await expect(page.locator('[data-testid=kpi-revenue]')).toBeVisible()
  await expect(page.locator('[data-testid=kpi-adr]')).toBeVisible()
  await expect(page.locator('[data-testid=kpi-occupancy]')).toBeVisible()
})

// Тест 2: CLOSER не бачить /planning (RBAC)
test('closer is redirected from planning', async ({ page }) => {
  await loginAs(page, 'closer@ruta.cam')
  await page.goto('/planning')
  await expect(page).toHaveURL(/\/(today|crm)/)
})

// Тест 3: Payments tab "Прострочені" показує overdue
test('overdue payments tab shows correct count', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/payments')
  await page.click('text=Прострочені')
  // Verify count badge matches table rows
})

// Тест 4: Dashboard queries < 500ms
test('planning page loads within 2 seconds', async ({ page }) => {
  await loginAs(page, 'revenue@ruta.cam')
  const start = Date.now()
  await page.goto('/planning')
  await page.waitForLoadState('networkidle')
  expect(Date.now() - start).toBeLessThan(2000)
})
```

---

## Контекст сесії

Ти Senior Full-Stack TypeScript Developer, будуєш RUTA OS.

**Прочитай перед початком:**
1. `CLAUDE.md` — стек, конвенції, ролі, KPI
2. `CHANGELOG.md` — що вже зроблено

**Поточний стан:** Chat A виконано. DB з реальними даними. Ця сесія — read-only дашборди.

**КРИТИЧНО:** Tremor Raw — copy-paste компоненти, НЕ npm пакет. Не встановлюй `@tremor/react`. Копіюй з https://raw.tremor.so/ або пиши власні Recharts обгортки.

---

## Ціль сесії

**Кожна роль бачить свої KPI без зайвого. Дані реальні з PostgreSQL. Оновлення при refresh.**

---

## Scope

### 1. Tremor Raw setup

Скопіюй ці компоненти в `src/components/charts/` (пиши власні обгортки над Recharts — він вже є в залежностях):

**`area-chart.tsx`** — для Revenue/ADR trend:
```typescript
'use client'
import { AreaChart as RechartsArea, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AreaChartProps {
  data: Array<Record<string, string | number>>
  index: string          // поле для X-axis
  categories: string[]   // поля для Y-axis (кілька ліній)
  colors?: string[]
  valueFormatter?: (value: number) => string
}

export function AreaChart({ data, index, categories, colors = ['blue'], valueFormatter }: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RechartsArea data={data}>
        <XAxis dataKey={index} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={valueFormatter} tick={{ fontSize: 12 }} />
        <Tooltip formatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined} />
        {categories.map((cat, i) => (
          <Area key={cat} type="monotone" dataKey={cat} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} />
        ))}
      </RechartsArea>
    </ResponsiveContainer>
  )
}
```

**`bar-chart.tsx`** — для конверсії по стадіях воронки

**`metric-card.tsx`** — KPI плитка:
```typescript
interface MetricCardProps {
  title: string
  value: string
  delta?: string        // "+5% vs минулий місяць"
  deltaType?: 'increase' | 'decrease' | 'neutral'
  icon?: React.ReactNode
}
```

**`donut-chart.tsx`** — для channel mix

### 2. Дашборд Today — `/today` enrichment

Додай до існуючої сторінки (з Chat A) ці widgets:

**EOD Progress widget:**
```
┌──────────────────────────────┐
│ Завершення дня               │
│ Необроблені звернення: ✅ 0  │
│ Без наступної дії: ⚠ 2      │
│ Прострочені задачі: ⚠ 1     │
│ ████████░░ 80% до нуля       │
└──────────────────────────────┘
```

Query:
```typescript
const [unprocessedInquiries, bookingsWithoutNextAction, overdueTasks] = await prisma.$transaction([
  prisma.inquiry.count({ where: { status: 'NEW', assignedToId: userId } }),
  prisma.booking.count({ where: { assignedCloserId: userId, stage: { in: ACTIVE_STAGES }, nextAction: null } }),
  prisma.task.count({ where: { assignedToId: userId, status: 'PENDING', dueAt: { lt: new Date() } } }),
])
```

**Конверсійна воронка (поточний місяць):**
```
Звернення: 47
  ↓ 89%
Пропозиція: 42
  ↓ 71%
Передоплата: 30
  ↓ 97%
Заїзд: 29
```

```typescript
// Server query
const currentMonth = { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) }
const funnelData = await prisma.booking.groupBy({
  by: ['stage'],
  where: { createdAt: currentMonth },
  _count: true,
})
```

### 3. Дашборд Planning — `/planning/page.tsx`

**Ролі що бачать:** ADMIN, DIRECTOR, REVENUE_MANAGER

**Секція 1: KPI Summary (поточний місяць)**

| KPI | Formula | Source |
|---|---|---|
| Revenue | sum(payments.amount WHERE status=SUCCEEDED) | payments table |
| ADR | Revenue / room_nights_sold | bookings + payments |
| RevPAR | Revenue / total_available_room_nights | rooms + calendar |
| Occupancy | room_nights_sold / available_nights × 100% | bookings |
| ALOS | avg(checkOut - checkIn in days) | bookings WHERE stage=CHECKOUT |

```typescript
// Розрахунок ADR:
const [revenueResult, bookedNights] = await prisma.$transaction([
  prisma.payment.aggregate({
    where: { status: 'SUCCEEDED', createdAt: monthRange },
    _sum: { amount: true }
  }),
  prisma.booking.aggregate({
    where: { stage: { in: ['CHECKIN', 'CHECKOUT'] }, checkIn: { gte: monthStart } },
    _sum: { nights: true }
  })
])
const adr = bookedNights._sum.nights 
  ? (revenueResult._sum.amount ?? 0) / bookedNights._sum.nights 
  : 0
```

**Секція 2: Revenue trend (12 місяців)**
- AreaChart з місяцями по X, Revenue по Y
- Порівняння з минулим роком (дві лінії)

**Секція 3: Channel mix (поточний місяць)**
- DonutChart: Direct / Booking.com / Airbnb / Referral
- З Booking.source field

**Секція 4: Manager performance table**

| Менеджер | Звернень | Пропозицій | Оплат | Конверсія | Revenue |
|---|---|---|---|---|---|
| Olha | 15 | 14 | 11 | 73% | ₴145k |
| Natalia | 12 | 10 | 8 | 67% | ₴98k |

```typescript
const managerStats = await prisma.user.findMany({
  where: { role: 'CLOSER' },
  include: {
    assignedBookings: {
      where: { createdAt: monthRange },
      select: { stage: true, payments: { select: { amount: true, status: true } } }
    }
  }
})
```

### 4. Дашборд Conversion — `/reports/conversion/page.tsx`

**Ролі:** ADMIN, DIRECTOR

- Воронка по місяцях (BarChart: 6 місяців, групований по стадіях)
- Причини втрат (DonutChart: PRICE / DATES / NO_RESPONSE / OTHER)
- Середній час в кожній стадії (таблиця)

### 5. Дашборд Payments — `/payments/page.tsx`

**Ролі:** ADMIN, DIRECTOR, CLOSER, FARMER

**Tabs:**
- [Всі] [Прострочені ● N] [Очікуються] [Історія]

**Прострочені tab:**
```typescript
const overdueSchedules = await prisma.paymentScheduleLine.findMany({
  where: {
    status: 'PENDING',
    dueAt: { lt: new Date() },
    booking: { assignedCloserId: userId }  // або всі якщо ADMIN/DIRECTOR
  },
  include: {
    booking: { include: { guest: true, assignedCloser: true } }
  },
  orderBy: { dueAt: 'asc' }
})
```

Таблиця: Прострочено N днів | Дата дедлайну | Order# | Гість | Менеджер | Сума | [💬 Нагадати]

**Кнопка "Нагадати":** placeholder (реальна відправка в Chat C)

### 6. Formatters (в `src/lib/utils.ts`)

```typescript
export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(amount)

export const formatPercent = (value: number) =>
  `${Math.round(value)}%`

export const formatNights = (n: number) =>
  `${n} ${n === 1 ? 'ніч' : n < 5 ? 'ночі' : 'ночей'}`
```

---

## НЕ робити в цій сесії

- ❌ Revenue forecasting / ML
- ❌ Export to Excel (placeholder кнопка ok)
- ❌ Channel manager integration (Booking.com)
- ❌ PDF reports
- ❌ Real-time auto-refresh (manual refresh достатньо для MVP)

---

## Data assumptions

Якщо DB майже порожня (тестові дані) — додай seed функцію для demo даних:
```bash
bun run prisma db seed -- --demo
```

Або показуй empty states з корисними CTA замість порожніх графіків.

---

## Verification

```bash
bun run typecheck && bun run lint
```

Перевір вручну:
1. `/planning` відкривається з KPI картками (навіть якщо 0)
2. `/reports/conversion` показує воронку
3. `/payments` показує таблицю з tabs
4. Всі запити < 500ms (check Network tab)

---

---

## Тестування + Auto-Healing (після кожного блоку)

```
КОД → typecheck → lint → unit tests → e2e → perf check → commit
    ↑___________fix (max 3 спроби)____________________________↑
```

**Auto-healing:**
- Recharts не рендериться → перевір `'use client'` на chart компоненті
- Query > 500ms → додай DB index або LIMIT
- RBAC redirect не працює → перевір middleware і CASL abilities для route
- Empty chart → додай empty state (не порожній контейнер)
- `@tremor/react` з'явився в imports → видали, використовуй Recharts напряму
- Після 3 спроб → зупинись, опиши

---

## Документування + Деплой (в кінці, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md — CURRENT STATUS
`✅ Chat D: BI Dashboards — [дата]`

### 2. Оновити CHANGELOG.md
```markdown
## [0.10.0] — YYYY-MM-DD — Chat D: BI Dashboards

### Added
- /planning: KPI cards (Revenue, ADR, RevPAR, Occupancy, ALOS) + 12-month trend chart
- /reports/conversion: funnel chart + loss reasons donut + stage timing table
- /payments: overdue tab + payment register with filters
- /today: EOD Progress widget (unprocessed + without next action + overdue tasks)
- Manager performance table (for DIRECTOR/ADMIN)
- Tremor Raw chart components: AreaChart, BarChart, DonutChart, MetricCard

### Technical
- New: src/components/charts/ (Recharts wrappers)
- RBAC: /planning restricted to ADMIN/DIRECTOR/REVENUE_MANAGER
- formatCurrency, formatPercent, formatNights helpers
- E2E tests: tests/e2e/dashboards.spec.ts
```

### 3. Фінальна перевірка
```bash
bun run typecheck && bun run lint && bun run test && bun run build
# + вручну перевір Network tab: кожен tRPC call < 500ms
```

### 4. Commit + Push
```bash
git add -A && git status
git commit -m "feat: BI dashboards — planning KPIs, conversion funnel, payment register"
git push origin main
```

### 5. Smoke-test prod
- /planning відкривається для revenue@ruta.cam
- /planning недоступний для closer@ruta.cam (redirect)
- /payments → Прострочені tab → показує дані

### 6. Фінальний звіт
```
✅ Chat D: BI Dashboards завершено
Тести: unit [N/N] ✅  e2e [N/N] ✅  perf ✅ (<500ms)
Deploy: app.ruta.cam ✅
```
