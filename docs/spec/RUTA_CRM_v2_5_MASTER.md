# RUTA CRM — Master Specification v2.5
## Зведений документ усіх ітерацій (v1.0 → v2.4), синхронізований з техстеком

**Дата:** 17 квітня 2026  
**Статус:** фінальний опис (без імплементаційного коду), готовий до Doc 1-3 імплементаційних  
**Стек (підтверджено):** Next.js 16 + Kiranism template + Shadcn UI + Prisma + PostgreSQL + Clerk (standard, без organizations) + Claude API + Vercel/Hetzner

---

# ЗМІСТ

- Частина 1: Філософія та цілі
- Частина 2: Термінологічний словник (фінал)
- Частина 3: Інформаційна архітектура (IA + меню per role)
- Частина 4: Модель даних (без Folio!)
- Частина 5: Спрощення для solo dev
- Частина 6: Правила мінімум-кліків
- Частина 7: UX принципи (P1-P20 референс)
- Частина 8: User Journeys (3 шляхи декомпозиція)
- Частина 9: Інвентар компонентів (Shadcn-based)
- Частина 10: Мікровзаємодії
- Частина 11: Клавіатурні скорочення
- Частина 12: Чекліст доступності
- Частина 13: Дорожня карта 6 фаз
- Частина 14: Success metrics

(ASCII-wireframes винесено в окремий файл `RUTA_CRM_v2_5_WIREFRAMES.md`)

---

# ЧАСТИНА 1 — Філософія та цілі

## Одне речення
Менеджер приймає звернення → відкриває одну картку → за ≤90 секунд і ≤5 кліків гість отримує посилання на оплату.

## Бізнес-цілі
| Метрика | Baseline (Odoo) | 90 днів | 180 днів |
|---|---|---|---|
| Частка прямих бронювань | 19% | 25% | 30% |
| Середній час відповіді | ~15 хв | <5 хв | <3 хв |
| Час до пропозиції | ~5 хв | <2 хв | <90 сек |
| Конверсія "Пропозиція → Оплата" | ~50% | 70% | 80% |
| Повторні візити (repeat rate) | ~30% | 38% | 45% |

## Системна філософія (2 головні принципи)
1. **Система керує менеджером**, не навпаки. Завжди є Наступна дія, неможливо зберегти неповні дані, результат кожної дії фіксується.
2. **Омніканальна автоматизація всього циклу** від реклами до повторної покупки з мінімальною участю людини.

---

# ЧАСТИНА 2 — Термінологічний словник (фінал)

## 2.1 UI-терміни (бачить користувач)

| UI-термін | Значення | Замість англіцизму |
|---|---|---|
| **Звернення** | Raw вхідний контакт | Lead/Inquiry |
| **Замовлення** | Уся операція від продажу до виїзду | Order/Booking/Opportunity |
| **Гість** | Партнер-клієнт | Guest/Customer |
| **Готель** | Об'єкт нерухомості | Property |
| **Номер** | Фізичний номер у готелі | Room |
| **Тариф** | Цінова пропозиція | Rate/Tariff |
| **Взаєморозрахунки** | Вкладка/секція з нарахуваннями та оплатами | Folio/Balance |
| **Нарахування** | Один рядок витрат гостя | Charge/LineItem |
| **Оплата** | Один платіж гостя | Payment/Transaction |
| **Графік оплат** | План "коли скільки платити" | PaymentSchedule |
| **До сплати** | Залишок боргу гостя | Due/Balance |
| **Прострочено** | Термін минув, не оплачено | Overdue |
| **Календар бронювань** | Grid номерів × дат | Calendar/"Шахматка" |
| **Черга передзвонів** | Список для обдзвону | Callback queue |
| **Передача гостя** | Handoff від залучення до розвитку | Handoff |
| **Повторні візити / Розвиток гостя** | Все що після виїзду | Retention |
| **Повернення гостя** | Активація після 6+ міс | Winback |
| **Допродаж** | Додатковий продаж | Upsell |
| **Зараз у готелі** | Стан гостя в період stay | In-house |
| **Під час відпочинку** | Час між заїздом і виїздом | In-stay |
| **Перед заїздом** | T-7 … T-1 | Pre-arrival |
| **Після виїзду** | T+0 … T+7 | Post-stay |
| **Зведення** / **Огляд** | Головна сторінка ролі | Dashboard |
| **Завершення дня** | Ціль: 0 unprocessed / 0 без next action / 0 overdue | EOD mission |
| **Підсумкова форма** | Обов'язкова після дзвінка/закриття | Wrap-up |
| **Режим "тільки сьогодні"** | Видно тільки today queue | Focus Mode |
| **Журнал змін** | Audit trail | Audit log |
| **Наступна дія** | Обов'язкова задача на кожній картці | Next Action |
| **Стан** | Поточний status | Status |
| **Ключові показники** (скор. КП) | Бізнес-метрики | KPI |
| **Нормативний час реакції** (скор. НЧР) | Очікуваний response time | SLA |
| **Зворотний зв'язок** / **Відгук** | Feedback | Feedback |
| **Повернення коштів** | Refund flow | Refund |
| **Рух коштів** | Cash flow звіт | Cash flow |
| **Прибутки і збитки** (скор. ПіЗ) | P&L звіт | P&L |
| **Заповненість** | Occupancy rate | Occupancy |
| **Середня ціна номера** (скор. СЦН) | ADR | ADR |
| **Дохід на номер** (скор. ДнН) | RevPAR | RevPAR |
| **Середня тривалість стаю** (скор. СТС) | ALOS | ALOS |
| **LTV** | Life-time value гостя | LTV (залишаємо, міжнародний стандарт) |

## 2.2 Код (розробник бачить)

**Принцип:** чисті англійські імена, семантично близькі до UI.

| Код | UI-еквівалент | Коментар |
|---|---|---|
| `Order` | Замовлення | Single aggregate root, містить все |
| `Inquiry` | Звернення | Окрема сутність (warming stage) |
| `Charge` | Нарахування | Line item у Order.charges[] |
| `Payment` | Оплата | Order.payments[] |
| `PaymentSchedule` | Графік оплат | Order.paymentSchedule[] |
| `Order.settlement` | До сплати (computed) | `sum(charges) − sum(payments)` |
| `Guest` | Гість | Partner entity |
| `Property` | Готель | Physical building |
| `Room` | Номер | Inventory unit |
| `Tariff` | Тариф | Pricing rule |
| `Handoff` | Передача гостя | Transfer event (Acq → Farmer) |
| `Task` | Задача | Actionable item з deadline |
| `nextAction` | Наступна дія (field на Order/Inquiry) | computed from Task[] |
| `Certificate` | Сертифікат | Money voucher |
| `AuditLog` | Журнал змін | Every state change |
| `Message` | Повідомлення | Chat message |
| `Conversation` | Розмова | Message thread |

## 2.3 Чому `Order.charges[]` inline, а не окрема сутність `Folio`

**Рішення:** `Folio` прибрано з коду повністю. Фінансові поля inline всередині `Order`.

**Причини:**
1. **Одне бронювання = один фінансовий контекст.** Немає користі від окремої сутності для 1:1 relationship.
2. **Менше коду, менше bugs.** Немає sync logic між Order і Folio.
3. **Зрозуміло при читанні:** `order.charges[0].amount` — очевидно що це.
4. **Легко extraктнути пізніше** якщо знадобиться (master folio для груп, split billing для B2B) — Prisma міграція додасть окрему таблицю без breaking changes.

UI-назва вкладки: **"Взаєморозрахунки"** (описує суть — нарахування ↔ оплати між двома сторонами).

---

# ЧАСТИНА 3 — Інформаційна архітектура

## 3.1 Високорівнева структура

```
/                      → redirect до /today
/today                 → Сьогодні (per role)
/inquiries             → Звернення (чати + дзвінки)
  /chats               → Чати
  /calls               → Дзвінки
/orders                → Замовлення
  /orders/[id]         → Картка замовлення (5 вкладок)
/guests                → Гості (360°)
/calendar              → Календар бронювань
/retention             → Повторні візити
/certificates          → Сертифікати
/payments              → Реєстр платежів
/campaigns             → Кампанії (маркетинг)
/rates                 → Тарифи (revenue manager)
/reports               → Звіти
/settings              → Налаштування

Public (токенізовані):
/p/[token]             → Пропозиція гостю (mobile-first)
/p/[token]/pay         → Оплата
/g/[token]             → Портал гостя (перед/під час/після)
```

## 3.2 Меню per role — матриця доступу

| Розділ | Менеджер залучення | Менеджер розвитку | Маркетолог | Керівник продажу | Бухгалтерія | Адмін рецепції | Менеджер з доходу | Керівник готелю | CEO |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Сьогодні | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Чати | own | own | RO | all | — | in-h | — | готель | all |
| Дзвінки | own | own | RO | all | — | in-h | — | готель | all |
| Замовлення | own | own | RO | all | RO | сьогодні | RO | готель | all |
| Гості | own | all | sgm | all | RO | in-h | sgm | готель | all |
| Календар | lookup | view | — | all | — | ✓ | occup | готель | all |
| Повторні візити | — | ✓ | RO | RO | — | — | RO | готель | all |
| Сертифікати | — | own | — | RO | ✓ | видати | RO | готель | all |
| Кампанії | — | — | ✓ | RO | — | — | RO | готель | all |
| Окупність трафіку | — | — | ✓ | RO | — | — | RO | готель | all |
| Реєстр платежів | — | — | — | RO | ✓ | own | — | готель | all |
| Тарифи | lookup | — | — | RO | — | — | ✓ | готель | all |
| Акції | lookup | — | — | RO | — | — | ✓ | готель | all |
| Операції готелю | — | — | — | — | — | ✓ | — | ✓ | all |
| Відгуки та скарги | — | own | — | all | — | — | — | ✓ | all |
| Звіти | особисті | особисті | маркетинг | команда | фінанси | зміна | дохід | готель | усі |
| Журнал змін | — | — | — | ✓ | — | — | — | ✓ | ✓ |
| Налаштування | — | — | UTM | команда | — | — | ціни | готель | ✓ |

Legend: `✓` повний доступ · `RO` тільки перегляд · `own` тільки своє · `all` все · `lookup` пошук · `sgm` тільки сегменти · `in-h` in-house гості · `view` тільки перегляд · `occup` з overlay заповненості

(Детальний розгляд меню кожної ролі — v2.4 Частина 3. Тут не дублюємо.)

---

# ЧАСТИНА 4 — Модель даних (без Folio!)

## 4.1 Core entities

```
User (Clerk-managed)
  └─ role: enum [ADMIN, CEO, HOTEL_MANAGER, SALES_HEAD,
                  ACQUISITION, FARMER, MARKETER,
                  RECEPTIONIST, REVENUE_MANAGER, ACCOUNTANT]
  └─ assignedProperties: String[]

Guest
  ├─ contacts (phone, email, telegram, etc.)
  ├─ preferences (JSON)
  ├─ visitCount, totalSpent, ltv (computed)
  ├─ segment: enum [NEW, FRIEND, FAMILY, VIP]
  ├─ lastStayDate, lastStaySeason
  ├─ portalToken
  └─ orders: Order[]

Property (готель)
  ├─ rooms: Room[]
  ├─ tariffs: Tariff[]
  └─ amenities, photos (JSON)

Inquiry (звернення)
  ├─ source: enum [telegram, instagram, helpcrunch, phone, form, OTA, direct]
  ├─ status: enum [NEW, WARMING, UNQUALIFIED, CONVERTED]
  ├─ unqualifiedReason: enum (якщо UNQUALIFIED)
  ├─ assignedTo: userId
  ├─ nextAction: string
  ├─ firstResponseAt, responseTimeMs
  └─ convertedToOrderId: String?

Order (замовлення — головна сутність)
  ├─ inquiryId: String? (якщо з звернення)
  ├─ guestId: String
  ├─ propertyId: String
  ├─ stage: enum [QUALIFY, PROPOSAL, AWAITING_PAY, PAID,
                  CHECKED_IN, CHECKED_OUT, LOST, CANCELLED]
  ├─ lostReason: enum (якщо LOST)
  ├─ cancelReason: enum (якщо CANCELLED)
  ├─ cancelType: enum [REFUND, CREDIT_BALANCE] (якщо CANCELLED)
  ├─ checkIn, checkOut: Date
  ├─ adults, children: Int
  ├─ roomId: String?
  ├─ tariffId: String?
  ├─ proposalToken: String?
  ├─ nextAction: string
  ├─ assignedTo: userId (може змінитися при handoff)
  ├─ previousAssignee: userId? (для аналітики)
  ├─ charges: Charge[]
  ├─ payments: Payment[]
  ├─ paymentSchedule: PaymentSchedule[]
  ├─ settlement (computed) = sum(charges) - sum(payments)
  └─ messages: Message[]

Charge (нарахування)
  ├─ orderId: String
  ├─ type: enum [BASE_ACCOMMODATION, MEAL_PACKAGE, DISCOUNT,
                  UPSELL_FARMER, UPSELL_IN_STAY, CERTIFICATE_APPLIED, REFUND]
  ├─ description: String
  ├─ amount: Decimal (негативне для знижок/сертифікатів)
  ├─ createdByUserId: String
  └─ createdAt: DateTime

Payment (оплата)
  ├─ orderId: String
  ├─ type: enum [PREPAYMENT, BALANCE, IN_STAY, REFUND]
  ├─ amount: Decimal
  ├─ status: enum [PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED]
  ├─ method: enum [WAYFORPAY, LIQPAY, CASH, BANK_TRANSFER, CERTIFICATE]
  ├─ externalTransactionId: String?
  ├─ paidAt: DateTime?
  └─ createdAt: DateTime

PaymentSchedule (графік оплат)
  ├─ orderId: String
  ├─ type: enum [PREPAYMENT_30, PREPAYMENT_50, BALANCE, CUSTOM]
  ├─ amount: Decimal
  ├─ dueAt: DateTime
  ├─ status: enum [PENDING, PAID, OVERDUE, CANCELLED]
  └─ paidAt: DateTime?

Task
  ├─ orderId or inquiryId (один з двох)
  ├─ type: enum [CALL_BACK, REPLY, SEND_PROPOSAL, CHECK_PAYMENT,
                  PRE_ARRIVAL, MID_STAY, POST_STAY_REVIEW, WINBACK, ...]
  ├─ assignedTo: userId
  ├─ dueAt: DateTime
  ├─ status: enum [OPEN, COMPLETED, CANCELLED]
  └─ result: String? (після завершення)

Handoff
  ├─ orderId: String
  ├─ fromUserId: String (Acquisition)
  ├─ toUserId: String (Farmer)
  ├─ handoffAt: DateTime
  └─ notes: String?

Certificate
  ├─ guestId: String
  ├─ amount: Decimal
  ├─ source: enum [FAMILY_3RD_VISIT, VIP_5TH_VISIT, REFERRAL,
                    COMPENSATION, CANCELLATION_CREDIT, MANUAL_CEO, ANNIVERSARY]
  ├─ issuedAt, expiresAt: DateTime
  ├─ usedAt: DateTime?
  ├─ usedInOrderId: String?
  └─ termsJson: JSON (blackout dates etc.)

Conversation + Message
  (omnichannel, як у v1.0 Doc 3)

AuditLog
  ├─ userId, action, entityType, entityId, changes (JSON)
  └─ createdAt
```

## 4.2 Computed fields (не зберігаються, обчислюються)

```typescript
Order.settlement = 
  sum(charges.amount) - sum(payments WHERE status='SUCCEEDED').amount

Order.totalCharged = sum(charges WHERE type != DISCOUNT && != REFUND)
Order.totalDiscount = sum(charges WHERE type == DISCOUNT)
Order.totalRefunded = sum(payments WHERE type == REFUND)
Order.totalPaid = sum(payments WHERE status == SUCCEEDED && type != REFUND)

Order.isOverdue = 
  paymentSchedule.any(s => s.dueAt < NOW && s.status != 'PAID')

Guest.ltv = sum(всіх оплат усіх Orders гостя)
Guest.visitCount = count(Orders WHERE stage == CHECKED_OUT)
Guest.segment = auto_compute(visitCount, ltv)
```

---

# ЧАСТИНА 5 — Спрощення для solo dev (Claude Code як "IT-компанія")

## 5.1 Що спрощуємо (радикально)

| Компонент | Було в v1.0 | Спрощено до | Причина |
|---|---|---|---|
| Real-time presence | Liveblocks/Yjs | SSE poll кожні 30с | Дорого + складно тестувати |
| Kanban drag-drop | dnd-kit full | Table + dropdown зміни stage | Менеджеру drag не потрібен |
| Command palette | 50+ actions | 15 actions у Phase 1 | Додавати поступово |
| TanStack Table | Faceted + URL state + virtualization | Simple filter + client pagination | <500 rows не потребує |
| Zustand stores | 5 з дня 1 | 1 (UI prefs), решта по потребі | Server state → React Query |
| Design tokens | Повна система | Shadcn defaults + 3 brand colors | Не винаходити тему |
| Empty states | Custom для всього | Шаблон "Нічого немає. [Створити]" | Customize під feedback |
| Mobile manager | Phase 1 окремий layout | Desktop-only v1 | Menedzhery за ноутбуком |
| Multichannel dispatch | 3 канали одночасно | Telegram-only у Phase 1 | Додати канали поступово |
| Servio bidirectional | Phase 1 | Read-only у Phase 2, bidirectional у Phase 4 | Поступово |

## 5.2 Що **не** спрощуємо (технічний борг)

- ❌ НЕ скорочувати Prisma schema — додати поле легко, міграція складна
- ❌ НЕ уникати Zod validation — server actions без валідації = bugs
- ❌ НЕ пропускати webhook signature verification — security-critical
- ❌ НЕ все ставити в Client Components — Next.js 16 Server Components за замовчуванням
- ❌ НЕ викидати TypeScript strict — runtime errors дорожчі
- ❌ НЕ змішувати tokenized guest URLs з auth routes — різні системи

## 5.3 Робочий ритм з Claude Code

```
Ранок:
  Сергій обирає 1-2 features з roadmap поточної фази
  Пише prompt з acceptance criteria
  
День:
  Claude Code генерує код
  Сергій переглядає diff, тестує локально
  Commits якщо OK, feedback якщо ні

Вечір:
  Deploy на staging
  Тестування з 1 менеджером
  Bug reports

Тиждень:
  2-3 features shipped на staging
  Demo + retro
```

**Темп:** 2-3 features/тиждень реалістично. Phase 1 (MVP) — 3 тижні.

---

# ЧАСТИНА 6 — Правила мінімум-кліків

## 6.1 Шлях А: Чат → Передоплата (5 кліків, <90 сек)

| # | Дія | Клік |
|---|---|---|
| 1 | Клік на NEW звернення в Чатах | клік 1 |
| 2 | Клік на кнопку **"Створити замовлення"** в чаті | клік 2 |
| 3 | Форма pre-filled (AI/manual), обрати номер | клік 3 |
| 4 | Клік **"Сформувати рахунок"** | клік 4 |
| 5 | Клік **"Надіслати"** → Telegram bot | клік 5 |

## 6.2 Шлях Б: Дзвінок → Передоплата (3 кліки, <60 сек)

| # | Дія | Клік |
|---|---|---|
| 0 | Дзвінок → auto-pop Order card (0 кліків) | — |
| 1 | Під час розмови — обрати номер зі списку | клік 1 |
| 2 | Клік **"Сформувати + надіслати"** (комбінована дія) | клік 2 |
| 3 | Підсумкова форма: summary + [Продовжуємо] | клік 3 |

## 6.3 Шлях В: Повторне бронювання (гість сам ініціює через Retention)

| # | Гість/Менеджер | Клік |
|---|---|---|
| 1 | Гість отримує Telegram повернення → клік на посилання | гість-1 |
| 2 | Обирає нові дати у порталі → [Створити замовлення] | гість-2 |
| 3 | Менеджер отримує лід pre-filled → [Схвалити + payment link] | менеджер-1 |
| 4 | Гість оплачує | гість-3 |
| 5 | Менеджер бачить PAID → [Передати фермеру] (авто або ручне) | менеджер-2 |

## 6.4 Захисні дії (корекція помилок)

| Дія | Кліків |
|---|---|
| Повернути на догрів | 2 (кнопка + причина) |
| Некваліфікувати | 2 (кнопка + причина) |
| Програти з причиною | 2 (кнопка + dropdown) |
| Скасувати з поверненням | 3 (кнопка + причина + confirm) |
| Скасувати з зарахуванням | 3 |

---

# ЧАСТИНА 7 — UX принципи (референс P1-P20)

## Ядро (з v1.0 SOW)
- **P1** — Right Person, Right Screen, Right Time
- **P2** — Zero Cognitive Load для новачка
- **P3** — Above the Fold = Вся інформація для рішення
- **P4** — Sequential CTA (послідовні дії)
- **P5** — Zero Friction для гостя
- **P6** — Автологування > ручне введення
- **P7** — Незворотні дії = підтвердження + наслідки
- **P8** — Feedback на кожну дію ≤300ms
- **P9** — Мобільний менеджер = спрощений режим
- **P10** — Помилка = підказка, не покарання

## Архітектурні (v2.0)
- **P11** — Source-first navigation (меню відбиває звідки запит)
- **P12** — One entity, many states (Замовлення = єдина сутність зі стадіями)
- **P13** — Defer everything non-core (AI, real-time, mobile — не MVP)
- **P14** — Foundations > Features (правильна модель даних > багато функцій)

## Task-driven (v2.1)
- **P15** — Always Next Action (кожен активний запис має одну дію)
- **P16** — Save Requires Complete Data (blockers > warnings)
- **P17** — Mandatory Wrap-up (обов'язкові підсумкові форми)
- **P18** — Focus Mode Default (видно тільки сьогоднішнє)
- **P19** — End-of-Day Zero Mission (0 unprocessed + 0 без next action + 0 overdue)
- **P20** — Audit Everything (все через AuditLog)

## Як застосовувати при конфлікті
- P7 > P4 (безпека важливіша за швидкість)
- P2 > P15 (новачок не повинен плутатись навіть за рахунок гнучкості)
- P5 > будь-що (гостя захищаємо передусім)

---

# ЧАСТИНА 8 — User Journeys (3 декомпозиції)

## 8.1 Шлях А: Чат → Передоплата (менеджер залучення)

```
Step 0: Гість пише в Telegram/Instagram/HelpCrunch
         ├─ webhook → Inquiry створюється (status=NEW)
         ├─ auto-assign (B2C → Olha, B2B → Natalia)
         └─ badge "🔴 NEW" у Чатах

Step 1: Менеджер бачить badge → клік на Inquiry
         ├─ відкривається conversation з AI-hints справа
         └─ AI Qualification (Phase 5): dates, guests, hotel pre-filled

Step 2: Менеджер пише відповідь (або ⌘J = Claude draft)
         ├─ Діалог продовжується
         └─ Гість ділиться датами

Step 3: Менеджер клікає "Створити замовлення" в чаті
         ├─ Order створюється, stage=QUALIFY
         ├─ Inquiry.status = CONVERTED
         └─ Форма Order відкривається з pre-filled

Step 4: Менеджер обирає номер (з dropdown, пізніше з Календаря)
         ├─ Ціна auto-calc з тарифів
         ├─ Показується повна сума + передоплата
         └─ ⌘Enter → "Сформувати рахунок"

Step 5: Order.stage = AWAITING_PAY
         ├─ Auto: PaymentSchedule.PREPAYMENT created
         ├─ Tokenized URL згенеровано
         ├─ WayForPay payment link active
         └─ ⌘S → відправити гостю в Telegram

Guest side:
Step 6: Гість отримує Telegram message з кнопкою
Step 7: Клік → Proposal page (mobile)
Step 8: Apple/Google Pay → WayForPay
Step 9: Webhook → Order.stage = PAID
         ├─ Auto: Handoff → Farmer assigned
         ├─ Auto: Farmer intro message to guest
         └─ Auto: Task для Farmer "Привітати + допродаж"
```

**Цільові метрики:**
- Менеджер: ≤90 сек від відкриття до відправлення
- Гість: ≤3 хв від посилання до оплати
- Загалом: 5 кліків менеджера + 3 tap гостя

## 8.2 Шлях Б: Дзвінок → Передоплата (менеджер залучення, focus mode)

```
Step 0: Ringostat → incoming call
         ├─ Screen pop-up "Від +380X... (Olena K., 3 стаї, LTV ₴42k)"
         └─ [Прийняти] [Перенаправити]

Step 1: Менеджер приймає трубку
         ├─ Order auto-created, stage=QUALIFY
         ├─ Форма відкрита з guest profile
         └─ Recording активне

Step 2: Під час розмови — заповнення форми
         ├─ Dates [required]
         ├─ Guests [required]
         ├─ Hotel [required]
         ├─ Побажання [optional]
         └─ Call recording + транскрипція в background

Step 3: Гість каже "Family Room 12-15 травня, оплачу Apple Pay"
         ├─ Менеджер обирає номер
         ├─ Ціна auto-calc
         └─ ⌘Enter → "Сформувати + надіслати"

Step 4: Дзвінок закінчується
         ├─ Payment link відправлено через Telegram (або email)
         └─ MANDATORY Підсумкова форма:
             - Summary 10+ слів [required]
             - Результат: [Продовжуємо / На догрів / Некваліфікований]

Step 5 → Step 9 такі ж як Шлях А
```

**Unique:**
- Auto-create Order при piднятті трубки (не треба натискати "Створити")
- 2 correction кнопки для помилок: "Повернути на догрів" / "Некваліфікувати"
- Mandatory wrap-up запобігає втрати контексту

## 8.3 Шлях В: Retention → Повторне бронювання (менеджер розвитку)

```
Step 0 (cron, 09:00 щодня):
         ├─ Query гостей de lastStayDate > 6 місяців AND optedIn
         └─ Або за seasonal trigger (літо ↔ зима)

Step 1: Для кожного гостя
         ├─ Claude Sonnet генерує персоналізоване повідомлення
         └─ Choose primary channel (user pref)

Step 2: Multichannel dispatch
         ├─ Primary: Telegram
         ├─ Fallback: WhatsApp → Email → SMS
         └─ Tracking: opened, clicked, replied

Step 3: Фермер бачить dashboard:
         ├─ Надіслано сьогодні: 23
         ├─ Відкрито: 15 (65%)
         └─ Відповіли: 4

Step 4: Гість відповідає
         ├─ Inquiry створюється зі tag="retention"
         ├─ Auto-assign → тому ж Фермеру (continuity)
         └─ Переходимо в Шлях А з point Step 1

Step 5-9 такі ж як Шлях А
```

**Seasonal triggers:**
| Минулий візит | Пропозиція | Timing |
|---|---|---|
| Літо | Зимовий гірськолижний | Вересень |
| Зима | Літо в Карпатах | Квітень |
| Свята | Раннє бронювання наступних свят | Середина року |
| No stay 18+ міс | Winback special | Щокварталу |

---

# ЧАСТИНА 9 — Інвентар компонентів (Shadcn-based)

## 9.1 Готові (з Kiranism)

| Shadcn | Використання в RUTA |
|---|---|
| `Command` | ⌘K command palette |
| `Sheet` | Order slide-over, Guest 360 sidebar |
| `Dialog` | Destructive confirms, send proposal confirm |
| `Table` + TanStack | Inbox list, Orders, Guests |
| `Form` + react-hook-form | Order form, settings |
| `Tabs` | Order card (5 tabs) |
| `Badge` | Status, channels, tags |
| `Avatar` | Guest photo, manager |
| `Select` + `Combobox` | Hotel/room/tariff picker |
| `Calendar` + `DatePicker` | Check-in/out |
| `Popover` | Quick actions, filter dropdowns |
| `Toast` (Sonner) | Immediate feedback |
| `Skeleton` | Loading states |
| `DropdownMenu` | Row actions, user menu |
| `ScrollArea` | Long lists |

## 9.2 Custom — потрібно побудувати

| Компонент | Призначення |
|---|---|
| `OrderCard` | 5 вкладок + контекст-панель (критичний) |
| `ChargesTable` | Вкладка Взаєморозрахунки з типами |
| `PaymentScheduleList` | Графік оплат з indicatorами стану |
| `CalendarGrid` | Шахматка multi-property з toggle готелів |
| `ContextSyncPanel` | Справа у всіх картках (чат/дзвінок/Order) |
| `AIComposer` | Textarea з ⌘J streaming |
| `NextActionBanner` | Always-visible Next Action у картках |
| `WrapUpForm` | Mandatory після call/unqualify/lost |
| `EODProgress` | "Завершення дня" widget |
| `ProposalPage` | Guest-facing payment page (mobile-first) |
| `GuestPortal` | /g/[token] layout pre/during/post |
| `HandoffTransition` | Анімація передачі Acq → Farmer |
| `PaymentRegisterTable` | Бухгалтерський реєстр з фільтрами |
| `OverdueWidget` | "Прострочені оплати" (dashboard) |

## 9.3 Libraries (з Kiranism)

- `lucide-react` — іконки
- `recharts` — dashboards, звіти
- `nuqs` — URL state для фільтрів
- `@tanstack/react-table` — таблиці
- `react-hook-form` + `zod` — форми
- `sonner` — toasts
- `embla-carousel-react` — carousel (proposal photos)
- `date-fns` — форматування дат
- `@ai-sdk/anthropic` — streaming Claude (Phase 5)

---

# ЧАСТИНА 10 — Мікровзаємодії

## 10.1 Loading states

- **Optimistic UI:** Prisma mutation → UI update immediate → rollback on error
- **Skeleton** для server-fetched data (React Query pending)
- **Spinner** тільки для <400ms (Doherty threshold). Довші = skeleton

## 10.2 Action feedback

| Action | Feedback |
|---|---|
| Archive conversation | Toast "Заархівовано. [Відмінити]" — 3 сек |
| Send proposal | Button → spinner → ✓ → success toast |
| Assign lead | Badge update + subtle fade |
| AI suggestion | Skeleton in composer → streaming |
| Payment success | Full-screen animation — 2 сек |
| Error | Red toast з [Retry] |

## 10.3 AI interactions (Intercom pattern)

1. Менеджер натискає ⌘J або ✨
2. Skeleton в composer
3. Claude streaming — слова як typewriter
4. Завершення → підсвічення: "Tab — прийняти · Esc — відхилити"
5. Sources показані нижче (Phase 5)
6. 👍/👎 inline — log у AIUsage для тюнінгу

## 10.4 Hover states

- **Row hover** → subtle bg change + row actions справа
- **Button hover** → darken 10%
- **Keyboard shortcut hint** → tooltip (Linear pattern)

## 10.5 Transitions

- Page navigation: 200ms fade (Next.js built-in)
- Sheet slide-in: 300ms ease-out
- Modal: 150ms scale+fade
- Toast: slide-in bottom-right, 200ms

## 10.6 Reduced motion

Respect `prefers-reduced-motion`: всі transitions → instant.

---

# ЧАСТИНА 11 — Клавіатурні скорочення

## 11.1 Global (скрізь)

| Скорочення | Дія |
|---|---|
| `⌘K` | Command palette |
| `⌘/` | Show all shortcuts (help overlay) |
| `⌘\` | Toggle sidebar |
| `H` | Сьогодні (Home) |
| `I` | Звернення (Inbox) |
| `O` | Замовлення |
| `G` | Гості |
| `M` | Календар (Map) |
| `R` | Повторні візити (Retention) |
| `P` | Звіти |
| `⌘,` | Налаштування |

## 11.2 Inbox (чати)

| Скорочення | Дія |
|---|---|
| `J/K` | Наступна/попередня розмова |
| `E` | Архівувати |
| `A` | Призначити мені |
| `⇧A` | Призначити комусь |
| `⌘Enter` | Надіслати відповідь |
| `⌘J` | AI suggest (Phase 5) |
| `Tab` | Прийняти AI |
| `Esc` | Відхилити AI |
| `C` | Створити нову розмову |
| `/` | Фокус пошуку |

## 11.3 Order / Картка замовлення

| Скорочення | Дія |
|---|---|
| `C` | Створити нове замовлення |
| `⌘S` | Зберегти / Надіслати |
| `⌘D` | Дублювати |
| `⌘⇧D` | Видалити (з confirm) |
| `⌘1` — `⌘5` | Перемикання між вкладками |
| `⌘⇧→` | Наступна стадія |
| `⌘⇧←` | Попередня стадія |

## 11.4 Gmail-style sequential (advanced)

| Скорочення | Дія |
|---|---|
| `G` → `I` | Go to Inbox |
| `G` → `O` | Go to Orders |
| `G` → `M` | Go to Calendar |
| `?` | Show shortcuts |
| `⌘⇧F` | Global search (Attio-style) |

**Правило:** shortcuts працюють поза input. В input — тільки `⌘`-combinations.

---

# ЧАСТИНА 12 — Чекліст доступності (Shadcn baseline + custom)

## 12.1 Shadcn-baseline (автоматично)

- ✅ WCAG AA contrast (Shadcn tokens)
- ✅ Focus visible (ring-2 ring-offset-2)
- ✅ Screen reader labels (aria-label, aria-describedby)
- ✅ Form validation з inline errors
- ✅ Keyboard navigation

## 12.2 Custom (треба додати)

- ✅ Skip link "Перейти до основного контенту"
- ✅ Semantic HTML (`<nav>`, `<main>`, `<button>`)
- ✅ `prefers-reduced-motion` support
- ✅ Lang attribute (UA за замовчуванням для менеджерів)
- ✅ Alt text для всіх image (photos готелів)
- ✅ Form labels explicit (не placeholder-only)
- ✅ Error announcements для screen readers
- ✅ Keyboard trap у modals (focus trap)
- ✅ Escape closes все modal/sheet
- ✅ Sufficient touch targets ≥44×44px (mobile)

## 12.3 Перевірка

- Tool: axe DevTools (автоматично)
- Manual: keyboard-only navigation тест
- Screen reader: VoiceOver (Mac) або NVDA (Windows)
- Color contrast: WebAIM contrast checker

---

# ЧАСТИНА 13 — Дорожня карта 6 фаз

## Phase 1: MVP Acquisition (тижні 1-3)
**Ціль:** замінити Odoo для менеджерів залучення. Telegram-only.

- Auth + RBAC (3 ролі: Admin, Sales Head, Acquisition)
- Prisma schema (Guest, Property, Room, Tariff, Inquiry, Order, Charge, Payment, PaymentSchedule, Task, Message, Conversation, AuditLog)
- Меню: Сьогодні, Чати, Замовлення, Гості
- Telegram webhook → Inquiry
- "Створити замовлення" з чату
- Картка Order з 5 вкладками + Context Sync Panel
- Task-driven: Next Action, save blockers, mandatory wrap-up
- WayForPay integration
- Today dashboard з Завершенням дня

**Що НЕ робимо:** Ringostat, Instagram, HelpCrunch, Farmer, Retention, Calendar, AI, Mobile.

## Phase 2: Scale (тижні 4-6)
- Ringostat + auto-create Order
- Instagram Direct + HelpCrunch
- Менеджер розвитку (Farmer) + handoff chain
- Post-stay new Inquiry auto-create
- Simple Calendar (single property)

## Phase 3: Retention + Multi-property + Accounting (тижні 7-10)
- RFM auto-segmentation + winback + anniversary
- Certificates UI + rules
- Calendar multi-property view
- Реєстр платежів (бухгалтерський модуль)
- Servio read-only sync

## Phase 4: Polish + OTA + Guest Portal (тижні 11-14)
- Website direct bookings
- Booking.com OTA import
- Guest Portal full
- Command palette full
- Keyboard shortcuts full
- Mobile manager

## Phase 5: AI Layer (тижні 15-18)
- AI qualify (Haiku)
- AI reply suggest (Sonnet)
- AI guest summary (daily cron)
- AI smart search
- Call transcription + extraction (Ringostat + Soniox)

## Phase 6+: B2B (окремо)
- B2B RFP pipeline
- Separate manager pool
- Group blocks у Calendar
- Contract templates

---

# ЧАСТИНА 14 — Success metrics

## 14.1 Phase 1 exit criteria

- [ ] Менеджер працює цілий день без Odoo
- [ ] Середній час відповіді <10 хв (baseline: 15 хв)
- [ ] Час до пропозиції <3 хв (baseline: 5 хв)
- [ ] Payment link delivery 99%+
- [ ] 0 критичних bugs, <5 minor/тиждень

## 14.2 Phase 3 exit criteria

- [ ] Всі 4 готелі працюють
- [ ] Retention campaigns: 40% open, 10% reply rates
- [ ] Acquisitions conversion: 30%+
- [ ] Calendar multi-property працює без помилок

## 14.3 Business metrics (30/60/90/180 days)

| Метрика | 30d | 60d | 90d | 180d |
|---|---|---|---|---|
| Avg response (чат) | <10 хв | <5 хв | <3 хв | <2 хв |
| Час до пропозиції | <3 хв | <2 хв | <90 сек | <60 сек |
| Payment conversion | 60% | 70% | 80% | 82% |
| Direct booking share | 21% | 25% | 30% | 32% |
| Repeat booking rate | +5% | +10% | +15% | +20% |
| AI acceptance (Phase 5+) | — | — | 60% | 75% |

---

# РЕЗЮМЕ v2.5 MASTER

**Головне:**

1. **`Folio` прибрано з коду повністю.** Charges/Payments/PaymentSchedule — inline в `Order`.
2. **UI:** "Взаєморозрахунки" замість "Фоліо/Баланс"
3. **LTV залишається як LTV** (міжнародна абревіатура)
4. **Всі розкидані частини (5-7, IA, Journeys, Components, Microinteractions, Shortcuts, A11y) зведено в один документ**
5. **9 ролей з матрицею доступу** — усі синхронізовано
6. **P1-P20 принципи** — єдиний referenceset
7. **6 фаз дорожньої карти** — реалістично для solo dev + Claude Code

**Супутній документ:** `RUTA_CRM_v2_5_WIREFRAMES.md` — всі ASCII-wireframes (Today, Inbox, Order card, Взаєморозрахунки, Calendar, Payment Register, Guest Portal).

**Наступний крок:**
- ✅ OK → готую Doc 1 (Research) / Doc 2 (UX Spec) / Doc 3 (Implementation) v2.5
- Або → перший Claude Code prompt для Phase 1 setup
