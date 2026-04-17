# CLAUDE.md — RUTA CRM Project Configuration

> Цей файл — центральна конфігурація для Claude Code. Читається перед кожною сесією.

---

## 🎯 Project Identity

**Name:** RUTA CRM  
**Owner:** Sergiy Korin (solo Product Owner + CTO)  
**Business:** RUTA Group — українська мережа готелів (4 об'єкти, ~170 номерів)  
**Goal:** Омніканальна CRM, що автоматизує весь клієнтський досвід від реклами до повторної покупки, з мінімальною участю команди.

**Philosophy:** Система керує менеджером, не навпаки. Завжди є Наступна дія. Неможливо зберегти неповні дані. Результат кожної дії фіксується.

---

## 🛠 Tech Stack (fixed)

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Template base:** [kiranism/next-shadcn-dashboard-starter](https://github.com/kiranism/next-shadcn-dashboard-starter)
- **UI:** Shadcn UI + Tailwind CSS
- **Database:** PostgreSQL (Prisma ORM)
- **Auth:** Clerk (standard, NO organizations)
- **AI:** Claude API (Anthropic SDK) — Phase 5
- **Deploy:** Hetzner CX42 + Coolify OR Vercel + Neon
- **Key libs:** react-hook-form + zod, nuqs, TanStack Query, TanStack Table, Sonner, date-fns, recharts, lucide-react

**NO:** Liveblocks, Yjs, Redux, moment.js, dayjs, styled-components, chakra UI.

---

## 🌐 Terminology (UI uses Ukrainian, code uses English)

| UI (укр.) | Code (en) | Description |
|---|---|---|
| Звернення | Inquiry | Raw inbound contact |
| Замовлення | Order | Main entity: sales → stay |
| Гість | Guest | Partner with history |
| Готель | Property | Physical location |
| Номер | Room | Inventory unit |
| Тариф | Tariff | Base Available Rate (BAR) |
| Акція | Promo | Discount rule |
| Нарахування | Charge | Line item in Order |
| Оплата | Payment | Transaction |
| Графік оплат | PaymentSchedule | Planned payments |
| Взаєморозрахунки | (Order's financial section) | Charges + payments + balance |
| Сертифікат | Certificate | Money voucher |
| Платник | Payer | Individual or legal entity (separate from Guest) |
| Календар бронювань | ReservationCalendar | Grid rooms × dates |
| Передача гостя | Handoff | Acquisition → Farmer transition |
| Повторні візити | Retention | Post-stay activities |
| Задача | Task | Actionable item |
| Наступна дія | nextAction (field) | Current step |
| Завершення дня | EOD Mission | 0 unprocessed/overdue/without-action |
| Підсумкова форма | Wrap-up | Mandatory after call/unqualify |
| Режим "тільки сьогодні" | Focus Mode | Today-only view |
| Журнал змін | AuditLog | Change history |
| До сплати | due (computed) | Remaining balance |
| Прострочено | overdue | Past due date |
| Стан | status / stage | Current state |

**DO NOT use `Folio` as separate entity** — charges/payments/paymentSchedule live INLINE in `Order`.

---

## 🎭 Roles (9 roles, RBAC)

1. `ADMIN` — system admin (dev, support)
2. `CEO` — Sergiy (full access)
3. `HOTEL_MANAGER` — operational manager of ONE hotel
4. `SALES_HEAD` — керівник продажу
5. `ACQUISITION` — менеджер залучення (Lead → Передоплата)
6. `FARMER` — менеджер розвитку (Передоплата → Виїзд → Повторні візити)
7. `MARKETER` — маркетолог (traffic, ROI)
8. `RECEPTIONIST` — адмін рецепції (check-in/out, in-stay)
9. `REVENUE_MANAGER` — тарифи, акції, прибутковість
10. `ACCOUNTANT` — бухгалтерія (Реєстр платежів, звіти)

---

## 📐 The 26 Dev Principles (MANDATORY)

### Architecture
1. **Server Components default** — `"use client"` ONLY коли потрібна interactivity
2. **Server Actions > API routes** — для CRUD. API routes тільки для webhooks і public tokenized endpoints
3. **Prisma transactions** — для multi-step mutations (`prisma.$transaction`)
4. **Zod on every server action input** — validate first, business logic after
5. **Error boundaries** — `error.tsx` на route level

### UX Patterns
6. **Toast on every mutation** (Sonner) — user завжди знає результат
7. **Skeleton > Spinner** — spinner тільки для <400ms actions
8. **Optimistic UI for safe actions only** — не для payments, refunds
9. **react-hook-form + zod + Shadcn Form** — не писати власні контролери
10. **date-fns + uk locale** — не moment, не dayjs
11. **nuqs for URL state** — не Zustand для server state
12. **TanStack Query for server state** — автоматичний refetch, caching

### Feature pragmatism
13. **One path, not many** — при двох способах зробити одне, видаляємо один
14. **Useful empty states** — завжди з CTA "next thing to do"
15. **Feedback loops inside UI** — undo via soft-delete, toasts для корекції
16. **i18n file single source** — `lib/i18n/uk.ts` для всіх UI-текстів

### Performance
17. **LCP < 2.5s, INP < 200ms, CLS < 0.1** — не 100/100, просто "зелений"
18. **next/image завжди** — з width/height, priority для LCP
19. **Database indexing** — на всі `where` поля

### Deploy
20. **Feature flags в .env** — toggle без rollback
21. **Webhook idempotency** — перевірка externalId перед створенням
22. **Staging mirror production** — всі webhooks sandbox
23. **Monitoring Day 1** — Sentry + Vercel Analytics + uptime

### Ship-first
24. **80/20 rule** — якщо 80% кейсів OK → shipping
25. **Iterate on live feedback** — 24h turnaround
26. **Timely pivots** — викидати half функціоналу якщо складніше ніж планували

---

## 📁 File Structure (feature-based)

```
src/
├── app/                  # Next.js routes
│   ├── (dashboard)/      # protected
│   ├── p/[token]/        # public proposal
│   ├── g/[token]/        # public portal
│   └── api/              # webhooks, cron, ai
├── components/
│   ├── ui/               # Shadcn primitives
│   ├── layout/
│   └── shared/
├── features/             # MAIN business logic
│   ├── inquiries/
│   ├── orders/
│   ├── guests/
│   ├── payments/pricing/ # pricing engine
│   ├── retention/
│   ├── marketing/
│   └── ai/
├── lib/                  # clients, utilities
├── hooks/
├── stores/               # Zustand (мінімально)
└── types/
```

**Each feature:**
- `components/` — React components
- `actions/` — Server Actions
- `schemas/` — Zod schemas
- `utils/` — pure functions
- `types.ts` — feature types

---

## 🔐 Security Rules

1. **Sensitive fields (documentNumber, bankAccountIban, addressStreet):**
   - Encrypted at rest (Prisma middleware, AES-256-GCM)
   - Access logged to AuditLog
   - Masked `••••••6789` for ролі без DOCUMENTS_READ permission
   - Never in exports
   - Auto-purge після 3 років (UA закон)

2. **Authentication:** Clerk middleware на всіх `(dashboard)` routes

3. **Authorization:** RBAC через `requirePermission()` helper (див. `lib/auth.ts`)

4. **Webhooks:** signature verification обов'язково (HMAC, etc.)

5. **IP addresses:** зберігаємо тільки SHA-256 hash (GDPR)

---

## 🎨 UI Conventions

1. **Buttons:**
   - Primary action — 1 на екрані
   - Secondary — outlined
   - Destructive — red з confirm modal

2. **Colors:**
   - Status dots: 🟢 success / 🟡 warning / 🔴 danger / ⚪ neutral
   - Cards: light bg, subtle border
   - Brand: RUTA navy blue (primary), warm orange (accent для CTAs)

3. **Spacing:** 4px grid (Tailwind `gap-1` через `gap-8`)

4. **Typography:**
   - `text-sm` (14px) — body, forms
   - `text-xs` (12px) — meta, badges
   - `text-lg` (18px) — section titles
   - `text-xl` (20px) — page headers
   - `text-base` (16px) — mobile (iOS no-zoom)

5. **Touch targets:** ≥ 44×44px (mobile)

6. **Forms:**
   - Labels explicit (не placeholder-only)
   - Errors inline під полем
   - Submit disabled якщо `!isValid`
   - Required fields: `*` + блокер на save

---

## ⌨ Keyboard Shortcuts (global)

- `⌘K` — Command palette
- `⌘/` — Show all shortcuts
- `H` — Сьогодні
- `I` — Звернення (Чати)
- `O` — Замовлення
- `G` — Гості
- `M` — Календар
- `⌘Enter` — Save/Submit
- `Esc` — Close modal/sheet
- `/` — Focus search

---

## 🧪 Testing Strategy (Phase 1-4: minimal; Phase 5+: full)

- Phase 1-4: **manual testing** (fast iteration)
- Phase 5+: додаємо unit tests для pricing engine, server actions
- E2E: Playwright для critical flows (Chat → Order → Payment)

**Жодних тестів у Phase 1-3** — пріоритет шипити.

---

## 🚀 Workflow

**Sergiy's daily ritual:**
1. Ранок: обираю 1-2 features з roadmap
2. Пишу Claude Code prompt з acceptance criteria
3. Переглядаю diff, тестую локально
4. Commit якщо OK, feedback if не
5. Deploy staging → жива перевірка з менеджером
6. Demo + retro в кінці тижня

**Claude Code behavior expectations:**
- Work autonomously для great-scoped tasks
- Ask clarifying questions тільки при reaaaally ambiguous requests
- Follow 26 principles без нагадування
- Default to Server Components
- Always Zod validate inputs
- Always show diff before applying
- Test locally before saying "done"

---

## 📚 Reference Documents

Коли потрібний контекст:

- `RUTA_CRM_v2_5_MASTER.md` — головна специфікація (філософія, ролі, data model basics, journeys, принципи)
- `RUTA_CRM_v2_5_WIREFRAMES.md` — ASCII UI для всіх екранів
- `RUTA_CRM_v2_6_ADDENDUM.md` — pricing engine logic, UX dev principles, guest tracking
- `RUTA_CRM_v2_7_ADDENDUM.md` — companions, birth dates, documents, payers
- `RUTA_CRM_IMPLEMENTATION_v2_7.md` — повна technical спец з Prisma schema, server actions, security

---

## 🎬 First-time setup

Якщо це fresh clone, виконайте:

```bash
# 1. Clone template
git clone https://github.com/kiranism/next-shadcn-dashboard-starter ruta-crm
cd ruta-crm

# 2. Install deps
pnpm install

# 3. Setup env
cp .env.example .env.local
# Fill DATABASE_URL, CLERK_*, ENCRYPTION_KEY (openssl rand -hex 32)

# 4. Init Prisma
pnpm prisma migrate dev --name init
pnpm prisma generate

# 5. Seed
pnpm prisma db seed

# 6. Dev
pnpm dev
```

---

## 🎯 Current Phase

**Phase 1 — MVP Acquisition (Week 1-3)**

Focus: Telegram → Order → Payment для acquisition менеджерів.

See `PHASE_1_SETUP_PROMPT.md` для першого завдання.

---

**END OF CLAUDE.md**

*Коли забув як потрібно щось зробити → спочатку читай цей файл. Якщо недостатньо — читай reference documents. Якщо досі unclear — прямо питай у власника (Sergiy).*
