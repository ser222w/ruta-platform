# RUTA CRM — Specification v2.6 (Addendum до v2.5)
## Доповнення без втрати попереднього

**Дата:** 17 квітня 2026  
**Статус:** v2.5 MASTER + WIREFRAMES **повністю зберігаються**. Цей документ — лише доповнення.  
**Що додається:** Шлях В повний (Фермер-driven), логіка ціноутворення, UX для solo dev, розширена модель Guest з tracking.

---

# ЧАСТИНА A — Шлях В: Повторне бронювання (Фермер-driven) [ВИПРАВЛЕННЯ v2.5]

## A.1 Принцип

**Фермер — центр retention-loop.** Не система автоматично шле розсилки — Фермер особисто веде стосунки, а система лише нагадує і генерує контент.

## A.2 Повний цикл після виїзду гостя

```
T+0 (день виїзду)
  Виїзд з готелю
  ├─ Auto: Order.stage = CHECKED_OUT
  ├─ Auto: Guest.visitCount += 1, Guest.ltv оновлено
  ├─ Auto: Segment перераховано (NEW → FRIEND → FAMILY → VIP)
  ├─ Auto: Якщо 3-й візит → Certificate 6,000₴ створено (FAMILY)
  ├─ Auto: Якщо 5-й візит → Certificate 10,000₴ + VIP статус
  ├─ Auto: Task для Фермера: "Післязаїздний дзвінок" (T+2 днів)
  └─ Auto: Telegram гостю "Дякуємо за відпочинок! Анкета NPS ⭐"

T+1 (наступний день)
  ├─ NPS form надіслано (якщо не відповів на T+0)
  └─ Якщо NPS < 7 → escalation керівнику готелю + Фермеру

T+2 (через день)
  Фермер виконує задачу "Післязаїздний дзвінок"
  ├─ Відкриває картку гостя → бачить повну історію + NPS
  ├─ Telegram/WhatsApp або дзвінок (за preference гостя)
  ├─ Сценарій дзвінка/повідомлення:
  │   1. Подяка за вибір RUTA
  │   2. Запит feedback (що сподобалось/ні)
  │   3. Фіксація нових побажань/preferences
  │   4. Soft-qualification: "Коли плануєте наступну поїздку?"
  │   5. Якщо є сертифікат — нагадування (без тиску)
  │   6. Підсумкова форма: next touchpoint coming up (місяць/квартал)

T+3 (mandatory wrap-up Фермера)
  ├─ Фермер закриває задачу з summary 10+ слів
  ├─ Фіксує отриману інформацію:
  │   - Оновлені preferences
  │   - Інтерес до наступного візиту (yes/maybe/no)
  │   - Орієнтовний період (якщо згадували)
  │   - Використання сертифіката (планує/ні)
  └─ Нова задача автоматично:
     - Якщо "yes" → "Надіслати пропозицію" через 7-14 днів
     - Якщо "maybe" → "Нагадати" через 30 днів
     - Якщо "no" → "Сезонний тригер" через 90 днів

T+7…T+14 (warm-up)
  Якщо "yes" або "maybe":
  ├─ Фермер надсилає персональну пропозицію (Telegram)
  │   "Оlено, пам'ятаю що вам сподобався вид на гори з A-201.
  │    У липні буде wellness-тиждень, можу забронювати номер з видом
  │    заздалегідь — скажіть дати?"
  ├─ Включає: сертифікат (якщо є) + персональні побажання
  └─ Якщо гість відповідає → Inquiry auto-створюється →
     Шлях А (але assigned до Фермера, не Acquisition)

T+30 / T+60 / T+90 (seasonal triggers)
  Якщо гість мовчить, Фермер отримує задачу з підказкою:
  ├─ Claude/template генерує message (Phase 5 — повна AI персоналізація)
  ├─ Фермер редагує, додає особисте
  └─ Надсилає — тригер автоматично scheduled на наступний період

T+180 (winback)
  Якщо >6 місяців тиші:
  ├─ Автоматичний "winback" лід з високим priority
  ├─ Фермер отримує задачу: "VIP-винбек" з повною історією гостя
  └─ Може запропонувати: спецпропозицію + сертифікат + persona offer
```

## A.3 Оновлена ASCII-wireframe задачі Фермера

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 ЗАДАЧА: Післязаїздний дзвінок                          │
│ Гість: Оlена К. (FAMILY · 3-й візит · LTV ₴42,000)       │
│ Термін: сьогодні до 18:00                                 │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ОСТАННЄ ПЕРЕБУВАННЯ:                                      │
│ • Готель: Ruta Polyana                                    │
│ • Номер: A-201 Family Room                                │
│ • Дати: 12-15 травня (3 ночі)                            │
│ • NPS: ⭐⭐⭐⭐⭐ (9/10)                                      │
│ • Відгук: "Дуже сподобався вид, тиша. Діти в захваті"    │
│                                                           │
│ СЕРТИФІКАТ (за 3-й візит):                                │
│ ₴ 6,000 · дійсний до 15.05.2027                           │
│ [✓ Нагадати про сертифікат]                              │
│                                                           │
│ СКРИПТ (можна пропустити):                                │
│ 1. Подякувати за вибір                                    │
│ 2. Запитати про враження                                  │
│ 3. Зафіксувати нові preferences                           │
│ 4. Soft-qualify: "Коли плануєте знову?"                   │
│ 5. Нагадати про сертифікат                                │
│                                                           │
│ [📞 Дзвінок]  [💬 Telegram]  [📧 Email]                   │
│                                                           │
│ ── ПІДСУМКОВА ФОРМА (після дзвінка) ──                    │
│                                                           │
│ Резюме (мін. 10 слів):                                    │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ Інтерес до наступного візиту:                             │
│ ◉ Так, планую                                             │
│ ○ Можливо, подумаю                                        │
│ ○ Ні поки що                                              │
│                                                           │
│ Орієнтовний період: [dropdown ▼]                          │
│                                                           │
│ Оновлення preferences:                                    │
│ + вид на гори (новий tag)                                 │
│ + тишина важлива (новий tag)                              │
│                                                           │
│ [Зберегти й закрити задачу]                               │
└──────────────────────────────────────────────────────────┘
```

## A.4 Розмежування ролей (оновлено)

| Етап | Хто відповідальний |
|---|---|
| Звернення → Сплачено | **Менеджер залучення** |
| Сплачено → Заселився → Виїхав | **Менеджер розвитку (Фермер)** |
| T+0 post-stay automation | Система |
| T+2 особистий дзвінок | **Фермер (обов'язково)** |
| T+7…T+180 warm-up | **Фермер (персонально)** |
| Якщо гість відгукається → нове Замовлення | **Фермер веде новий Order** |
| Handoff назад до Acquisition | **Тільки якщо гість сам просить / overflow** |

**Ключове:** коли гість повертається, Замовлення веде той самий Фермер — це забезпечує continuity стосунків і додаткову мотивацію Фермера.

---

# ЧАСТИНА B — Логіка ціноутворення

## B.1 Три шари цін

```
┌────────────────────────────────────────────┐
│ ШАР 1: BAR (Best Available Rate)           │
│ Базова ціна за номер × ніч                 │
│ Визначається Revenue Manager за сезонами   │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ ШАР 2: АКЦІЇ (Promotions)                  │
│ Знижки або override ціни з умовами         │
│ Застосовуються автоматично якщо підходять  │
└────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────┐
│ ШАР 3: СЕРТИФІКАТ (як метод оплати)        │
│ Не знижка — зменшує суму до сплати         │
│ Застосовується після фінальної ціни        │
└────────────────────────────────────────────┘
```

## B.2 BAR — базовий тариф

**Структура `Tariff`:**

```
Tariff {
  propertyId       
  roomType         Standard / Family / Deluxe / Suite
  pricePerNight    
  currency         UAH
  mealPlan         без / сніданок / напівпансіон / повний
  validFrom        дата початку
  validTo          дата кінця
  minNights        1
  minGuests        1
  maxGuests        4
}
```

**Правило:** для кожного (готель, тип_номера, дата) існує **рівно один активний BAR**. Це забезпечується constraint на Prisma level.

**Приклад активних BAR на квітень:**
| Готель | Тип | Дати | Ціна/ніч |
|---|---|---|---|
| Polyana | Family | 1-22 квіт | ₴5,500 |
| Polyana | Family | 23-30 квіт (Пасха) | ₴8,500 |
| Polyana | Deluxe | 1-22 квіт | ₴7,200 |

## B.3 Акції — правила та умови

```
Promo {
  name              "Весняний рання пташка" 
  propertyId        
  roomTypes[]       ['Family', 'Deluxe']
  validFrom         
  validTo           
  
  // тип знижки (один з):
  discountPct       10  (знижка у %)
  // АБО
  priceOverride     5000  (фіксована ціна/ніч, ігнорує BAR)
  
  // умови застосування:
  minNights         3
  minGuests         2
  maxGuests         null
  channelsAllowed   ['telegram', 'direct']  (не booking.com)
  advanceDays       30  (бронювання за X днів)
  
  // сегменти:
  guestSegments     ['NEW', 'FRIEND']
  
  // пріоритет при конфлікті:
  priority          10  (вищий = wins)
  
  // bookingWindow:
  bookableFrom      2026-03-01
  bookableTo        2026-04-30
  
  stayableFrom      2026-05-01
  stayableTo        2026-06-30
  
  blackoutDates[]   [2026-05-01, 2026-05-02]
}
```

**Алгоритм вибору акції для (Замовлення, номер, дата):**

1. Фільтр по `propertyId`, `roomType`, `validFrom/To`, `stayableFrom/To`
2. Фільтр по `minNights` (перевірка проти total nights)
3. Фільтр по `minGuests`/`maxGuests`
4. Фільтр по `channelsAllowed` (перевірка проти `Order.source`)
5. Фільтр по `advanceDays` (перевірка проти `today + X ≤ checkIn`)
6. Фільтр по `guestSegments` (перевірка проти `Guest.segment`)
7. Фільтр по `blackoutDates`
8. **Якщо кілька eligible → обираємо найвигіднішу для гостя** (найнижча фінальна ціна/ніч)
9. При рівній ціні → `priority` (вищий wins)
10. При рівному priority → найстаріша (`createdAt` ASC)

## B.4 Corner case: multi-period stays (SPLIT NIGHTLY PRICING)

**Сценарій:** гість бронює 21-25 квітня. 21-22 — стандартний сезон (BAR1=₴5,500), 23-25 — Пасха (BAR2=₴8,500).

**Алгоритм:**

```
1. Визначаємо всі нічні сегменти:
   - Ніч 21-22: BAR = ₴5,500
   - Ніч 22-23: BAR = ₴5,500
   - Ніч 23-24: BAR = ₴8,500 (Пасха)
   - Ніч 24-25: BAR = ₴8,500 (Пасха)

2. Для кожної ночі окремо:
   - Перевіряємо eligible акції (акція може покривати лише частину ночей!)
   - Застосовуємо best promo для цієї ночі
   
3. Сумуємо:
   total = Σ (nightly_rate після promo) для всіх ночей
```

**Приклад розрахунку:**
- 21-22: ₴5,500 × 2 ночі = ₴11,000
- 23-25: ₴8,500 × 2 ночі = ₴17,000 (Пасха — акції не діють)
- **Всього: ₴28,000**

У картці Замовлення показуємо **розбивку по періодах:**

```
┌───────────────────────────────────────────────┐
│ НАРАХУВАННЯ                                    │
├───────────────────────────────────────────────┤
│ 21-22.04  Family standard × 2 ночі  ₴11,000   │
│ 23-25.04  Family Пасха × 2 ночі      ₴17,000   │
│                                      ────────  │
│                              Разом:  ₴28,000   │
└───────────────────────────────────────────────┘
```

## B.5 Corner case: room change mid-stay (переселення)

**Сценарій:** гість спочатку Family Room, потім переселяється у Suite.

**Моделювання:**
- Дві окремі `Charge` записи:
  - `BASE_ACCOMMODATION`: Family Room × N1 ночей
  - `BASE_ACCOMMODATION`: Suite × N2 ночей
- Дати не перекриваються (валідація: `family.endDate <= suite.startDate`)
- Допустимо `family.endDate == suite.startDate` (переселення midnight)

## B.6 Cascade ордер обчислень

**Порядок застосування:**

```
1. NIGHTLY RATES
   for each night in stay:
      base_rate[night] = tariff_lookup(hotel, roomType, date)
      best_promo[night] = find_best_promo(night, guest, channel)
      final_rate[night] = apply_promo(base_rate, best_promo)
   
   accommodation_total = Σ final_rate[all nights]

2. MEAL PLAN
   meal_total = meal_price_per_person × guests × nights

3. SERVICES (якщо є — трансфер і т.д.)
   services_total = Σ service_prices

4. SUBTOTAL
   subtotal = accommodation_total + meal_total + services_total

5. MANAGER DISCOUNT (optional, rare)
   if manager_discount_pct:
      subtotal = subtotal × (1 - manager_discount_pct / 100)
   
   (якщо > 10% — потрібен апрув керівника — блокер)

6. FINAL TOTAL (це фінальна ціна номера)
   final_total = round(subtotal)

7. CERTIFICATE (application as payment)
   if certificate_applied:
      payment_due = final_total - certificate_amount
      payment_due = max(payment_due, 0)
   else:
      payment_due = final_total

8. PREPAYMENT CALCULATION
   prepay_pct = lookup_prepay_rule(guest.segment, tariff.prepay_rule)
      NEW:    50%
      FRIEND: 30%
      FAMILY: 30%
      VIP:    20%
   
   prepay_amount = round(payment_due × prepay_pct)
   balance_amount = payment_due - prepay_amount
```

## B.7 Corner case: два гості у різних сегментах

**Рідкісний:** якщо в картці гість FAMILY, але платить його колега (NEW).  
**Рішення:** сегмент — на гостя-власника Order. Payer — окреме поле, не впливає на pricing.

## B.8 Corner case: certificate > final_total

**Сценарій:** сертифікат ₴6,000, final_total ₴5,000.

**Правила:**
- Використовуємо ₴5,000 сертифіката
- Залишок ₴1,000 — залишається активним (expires як раніше)
- УВАГА: сертифікат не можна "розрізати" між двома Orders — використовуємо тільки в одному Order повністю або частково

## B.9 Corner case: overlap акцій

**Сценарій:** два промо покривають ту ж саму ніч + той самий room type + той самий guest segment.

**Рішення:**
1. Обчислюємо final_rate для кожного з них.
2. Обираємо той, що дає нижчу final_rate (вигідніше гостю).
3. При рівному final_rate — `priority` (вищий wins).
4. Акції НЕ комбінуються (не stacking). Виняток: якщо промо позначено `stackable: true` (backlog для Phase 4+).

## B.10 UI для Revenue Manager — створення акції

```
┌──────────────────────────────────────────┐
│ 🎁 СТВОРИТИ АКЦІЮ                         │
├──────────────────────────────────────────┤
│ Назва: [Весняний ранні пташка        ]   │
│                                          │
│ Готель: [Ruta Polyana ▼]                 │
│ Типи номерів: [✓ Family] [✓ Deluxe]     │
│                                          │
│ Період дії акції:                        │
│ [01.03.2026] → [30.04.2026]              │
│                                          │
│ Період перебування (stayable):           │
│ [01.05.2026] → [30.06.2026]              │
│                                          │
│ Тип знижки:                              │
│ ◉ Знижка %:  [10]                        │
│ ○ Фіксована ціна: [____] ₴/ніч           │
│                                          │
│ УМОВИ ───────────────────                 │
│ Мін. ночей:        [3]                   │
│ Раннє бронювання:  [30] днів             │
│ Канали:            [✓ Telegram]          │
│                    [✓ Direct]            │
│                    [ ] Booking.com       │
│ Сегменти гостей:   [✓ NEW] [✓ FRIEND]   │
│ Чорні дати:        [+ 01.05.2026]        │
│                    [+ 02.05.2026]        │
│                                          │
│ Пріоритет: [10]                          │
│                                          │
│ [Попередній перегляд розрахунку]         │
│ [Зберегти]  [Скасувати]                  │
└──────────────────────────────────────────┘
```

---

# ЧАСТИНА C — UX принципи для solo dev (pragmatic ship-first)

**Філософія:** "Краще запустити швидко і покращувати" > "Зробити ідеально з першого разу".

## C.1 Архітектурні принципи (мінімум bugs)

### UX-dev-1: Server Components за замовчуванням
- Будь-який component — **Server Component**, якщо не потребує interactivity
- `"use client"` — тільки там, де є `useState`, `useEffect`, event handlers
- Менше client JS = менше hydration bugs = швидше LCP
- Claude Code за замовчуванням схиляється до client — потрібен explicit prompt "prefer Server Components"

### UX-dev-2: Server Actions замість API routes
- CRUD операції — через Server Actions (`'use server'`)
- API routes тільки для: webhooks, tokenized public endpoints (`/p/[token]`)
- Server Actions + Zod = type-safe пайплайн

### UX-dev-3: Prisma transactions для multi-step ops
- Якщо операція міняє >1 запис — обгортаємо в `prisma.$transaction`
- Немає partial failures
- Приклад: "Send proposal" = update Order + create PaymentSchedule + create AuditLog — все в одній транзакції

### UX-dev-4: Zod validation на вході server action
```
  every server action:
    input → Zod.parse() → throws on invalid
    business logic
    return { success: true, data }
```
Claude Code спробує скіпати — вимагати explicit.

### UX-dev-5: Error boundaries на route level
- Кожен route має `error.tsx`
- Глобальний `error.tsx` на root
- Error показує: що сталось + [Retry] + [Назад]
- Помилки логуються в Sentry (з Phase 1)

## C.2 UX patterns (consistency = zero learning curve)

### UX-dev-6: Toast на кожну мутацію
- Успіх → green toast "Збережено ✓" (2 сек)
- Помилка → red toast з [Retry] button
- Sonner library (з Kiranism) — one liner

### UX-dev-7: Skeleton завжди, Spinner рідко
- Сторінка завантажується → skeleton layout
- Button спрацьовує → spinner **всередині** кнопки (не overlay)
- Блокування UI spinner — тільки для <400ms (Doherty threshold)

### UX-dev-8: Optimistic UI тільки для безпечних дій
- ✅ Toggle checkbox, зміна tag, assign → optimistic
- ❌ Send proposal, payment, refund → wait for confirmation
- Правило: якщо rollback складний або user confused — не optimistic

### UX-dev-9: Form = react-hook-form + zod + Shadcn `<Form>`
- Не писати власні контролери
- Валідація на client (react-hook-form) + re-validate на server (zod)
- Error messages inline (під полем)
- Submit button disabled поки не `isValid`

### UX-dev-10: Дати через date-fns, не raw Date
- `format(date, 'dd.MM.yyyy')` універсально
- `formatRelative(date, baseDate)` для "5 хв тому"
- Uk locale: `{ locale: uk }` з date-fns/locale
- No dayjs / moment — зайва залежність

### UX-dev-11: URL state через `nuqs`
- Фільтри таблиць, вкладки, пагінація — всі в URL
- Shareable, bookmark-able, back/forward button works
- Не Zustand для server state

### UX-dev-12: React Query (TanStack) для server state
- `useQuery` для fetch
- `useMutation` для write
- Automatic refetch on focus/reconnect
- Query keys consistent: `['orders', filters]`, `['guest', id]`

## C.3 Feature-level pragmatism

### UX-dev-13: Один шлях, не багато
- Якщо є 2 способи зробити одне → вибираємо 1 і видаляємо інший
- Приклад: створити Order — тільки з Чату або з Дзвінка. Не через окремий "+ Створити" button (в Phase 1)
- Менше кнопок = менше пояснень новачку

### UX-dev-14: Empty states корисні, а не порожні
- "Нічого немає" — завжди з підказкою "Наступне що треба зробити"
- Приклад: нова інсталяція, менеджер без клієнтів → "Додайте перший готель → [Почати тур]"

### UX-dev-15: Feedback loops всередині UI
- Натиснув "Скасувати" → toast "Скасовано. [Відмінити]" 5 сек
- Undo через soft-delete (status = archived), hard-delete тільки через cron після 30 днів
- Забезпечує психологічну безпеку менеджера

### UX-dev-16: Мова — одне місце
- Всі тексти UI — в `lib/i18n/uk.ts` (навіть якщо на першому етапі немає translation)
- Сергій може швидко замінити слово в одному місці
- Готує ґрунт для багатомовності гостьового порталу

## C.4 Performance baseline (щоб не деградувати)

### UX-dev-17: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Вимірюємо в production через Vercel Analytics
- Якщо routing route пробиває budget → alert
- Не оптимізуємо до 100/100 — достатньо "зелений"

### UX-dev-18: Images через next/image
- Завжди з `width`/`height` (уникаємо CLS)
- `priority` для above-the-fold
- WebP auto-conversion
- Lazy load for offscreen

### UX-dev-19: Database indexing
- Індекси на всі `whereClause` поля: `status`, `assignedTo`, `propertyId`, `stage`, `checkIn`
- Composite indexes для common queries
- `prisma.$queryRaw` тільки для аналітики, не для transactional

## C.5 Deploy / reliability patterns

### UX-dev-20: Feature flags у `.env`
- Нову фічу за feature flag → можна deploy без exposing
- Прості boolean в `process.env.FEATURE_AI_SUGGESTIONS` (Phase 5)
- При проблемі — toggle false, не rollback

### UX-dev-21: Webhook idempotency
- Всі webhooks (WayForPay, Telegram, Ringostat, HelpCrunch) — idempotent
- Перевірка `externalId` в database перед створенням
- Rerun webhook = no duplicates

### UX-dev-22: Staging mirror production
- Staging має всі webhooks active (sandbox modes)
- Testing сценаріїв end-to-end перед production
- Сергій тестує сам перед user rollout

### UX-dev-23: Monitoring обов'язковий з дня 1
- Sentry для помилок
- Vercel Analytics для перформансу
- Simple uptime check (Better Uptime або free)
- PostgreSQL slow query log активний

## C.6 Ship-first mentality

### UX-dev-24: 80/20 правило на feature
- Якщо feature в 80% випадків робить те що треба — shipping
- 20% edge cases можна відкласти
- Приклад: створення Order з Telegram працює для 95% — OK. Edge case "гість без username" — пізніше.

### UX-dev-25: Iterate на живому feedback
- Новий feature → deploy → реальний менеджер користується 1 день → feedback → iteration
- Не шліфуємо на dev до досконалості
- Feedback loop короткий (24 год turnaround)

### UX-dev-26: Вчасно відмовлятись
- Якщо feature складніша ніж планувалось — переоцінюємо
- Викидаємо половину функціоналу, shipping мінімум
- Реверсуй напрямок якщо стало ясно що це не те

## C.7 Як це перекладається в Claude Code prompts

**Приклад прагматичного prompt:**
```
Implement server action `createOrderFromChat(inquiryId)`:
- Server Action in src/features/orders/actions/create-from-chat.ts
- Input: { inquiryId: string }, validated via Zod
- Logic (in prisma.$transaction):
  1. Fetch inquiry with guest
  2. Create Order with stage='QUALIFY', link to inquiry
  3. Update inquiry.status = 'CONVERTED'
  4. Create Task "Підготувати пропозицію" assignee=current user, due=+2h
  5. Create AuditLog entry
- Return { success, orderId }
- Use `revalidatePath('/inbox')` and `revalidatePath('/orders')` after
- Error handling: rethrow Zod errors, catch-all for others with friendly message

Tech stack: Next.js 16 App Router, Prisma, Clerk auth, Zod.
Target: simplest working version. No tests yet. No edge cases beyond Zod validation.
```

---

# ЧАСТИНА D — Розширена модель даних Guest (повний tracking)

## D.1 Мета

**Бачити всі touchpoints гостя — від першого кліку до повторного візиту.** Наскрізна аналітика окупності кожного каналу. Атрибуція витрат на залучення → LTV.

## D.2 Оновлена модель `Guest` з tracking fields

```
Guest {
  // ── БАЗОВА ІДЕНТИФІКАЦІЯ ──
  id                       String
  firstName, lastName      String
  email, phone             String?
  language                 'uk' / 'en' / 'ru'
  
  // ── МЕСЕНДЖЕРИ ТА СОЦІАЛЬНІ ID ──
  telegramUserId           String?   // унікальний Telegram user ID
  telegramUsername         String?   // @username
  telegramChatId           String?   // chat ID for bot
  telegramBotStartParam    String?   // deeplink source (utm_source in Telegram)
  
  instagramUserId          String?   // Meta Graph API user ID
  instagramUsername        String?   // @username
  instagramThreadId        String?   // thread ID для Direct
  
  facebookPsid             String?   // Page-Scoped User ID (Messenger)
  whatsappPhoneId          String?   // WhatsApp Business phone ID
  viberId                  String?
  
  // ── UTM ПЕРШИЙ КОНТАКТ (never overwrite!) ──
  firstUtmSource           String?
  firstUtmMedium           String?
  firstUtmCampaign         String?
  firstUtmContent          String?
  firstUtmTerm             String?
  firstTouchpointAt        DateTime?
  firstTouchpointChannel   String?   // telegram / instagram / phone / form
  firstLandingPage         String?   // URL куди вперше прийшов
  firstReferrer            String?   // HTTP referrer
  
  // ── UTM ОСТАННІЙ КОНТАКТ (update on each) ──
  lastUtmSource            String?
  lastUtmMedium            String?
  lastUtmCampaign          String?
  lastUtmContent           String?
  lastUtmTerm              String?
  lastTouchpointAt         DateTime?
  lastTouchpointChannel    String?
  
  // ── GOOGLE TRACKING ──
  gaClientId               String?   // _ga cookie (GA4 client ID)
  gclid                    String?   // Google Ads click ID
  dclid                    String?   // Campaign Manager
  wbraid                   String?   // iOS Google click (privacy)
  gbraid                   String?   // iOS Google click (privacy)
  
  // ── META TRACKING ──
  fbclid                   String?   // Facebook click ID
  fbp                      String?   // _fbp cookie (browser ID)
  fbc                      String?   // _fbc cookie (click ID hashed)
  metaAdAccountId          String?   // з якого ad account
  metaCampaignId           String?   // конкретна кампанія
  metaAdSetId              String?   // конкретний ad set
  metaAdId                 String?   // конкретна реклама
  metaPlacement            String?   // feed / story / reels / ...
  
  // ── TIKTOK / INSTAGRAM INTERNAL ──
  tiktokClickId            String?   // ttclid
  instagramMediaId         String?   // якщо прийшов з конкретного поста
  
  // ── Ringostat (call tracking) ──
  ringostatFirstCallId     String?
  ringostatCallSource      String?   // з якого "віртуального" номера
  ringostatCampaign        String?   // утм-кампанія з колтрекінгу
  
  // ── WEBSITE SESSION CONTEXT ──
  firstSessionId           String?
  firstUserAgent           String?
  firstDeviceType          String?   // mobile / tablet / desktop
  firstBrowser             String?   // chrome / safari / firefox
  firstOs                  String?   // ios / android / windows / macos
  firstGeoCity             String?   // геолокація (опціонально)
  firstGeoCountry          String?
  firstIpHash              String?   // HASHED IP (GDPR-safe)
  
  sessionCount             Int       // скільки разів заходив
  pagesViewedTotal         Int
  totalTimeOnSiteMs        BigInt
  
  // ── MARKETING ATTRIBUTION & COST ──
  acquisitionCostEstimated Decimal?  // computed: скільки витратили щоб залучити
  attributionModel         String    // 'first-touch' / 'last-touch' / 'linear'
  
  // ── CONSENT (GDPR) ──
  consentMarketingOptIn    Boolean   @default(false)
  consentTransactionalOnly Boolean   @default(true)
  consentGivenAt           DateTime?
  consentSource            String?   // 'telegram-bot' / 'website-form' / 'manager'
  consentChannels          String[]  // ['telegram', 'email', 'sms', 'whatsapp']
  gdprDeletionRequested    Boolean   @default(false)
  
  // ── GUEST LIFECYCLE ──
  segment                  'NEW' | 'FRIEND' | 'FAMILY' | 'VIP'
  visitsCount              Int       @default(0)
  totalSpent               Decimal   @default(0)
  ltv                      Decimal   @default(0)
  lastStayDate             DateTime?
  lastStaySeason           String?
  loyaltyTier              String    @default('bronze')
  rfmScore                 String?
  
  // ── PREFERENCES (learned over time) ──
  preferences              Json?     // { quietRoom, lateBreakfast, viewMountain, kidsMenu, spa }
  dietaryNotes             String?
  
  // ── AI-GENERATED ──
  aiSummary                String?   // Claude daily cron summary
  aiSummaryUpdatedAt       DateTime?
  
  // ── PORTAL ACCESS ──
  portalToken              String    @unique  // stable guest link
  
  // ── TIMESTAMPS ──
  createdAt                DateTime
  updatedAt                DateTime
  
  // ── RELATIONS ──
  inquiries                Inquiry[]
  orders                   Order[]
  certificates             Certificate[]
  touchpoints              Touchpoint[]  // NEW entity (див D.3)
}
```

## D.3 Нова сутність `Touchpoint` — лог взаємодій

```
Touchpoint {
  id                  String
  guestId             String
  guest               Guest @relation
  
  type                'chat_message' | 'call' | 'form_submit' 
                    | 'website_visit' | 'ad_click' | 'email_open'
                    | 'email_click' | 'bot_interaction' | 'portal_view'
  
  channel             'telegram' | 'instagram' | 'whatsapp' | 'email'
                    | 'phone' | 'website' | 'meta_ad' | 'google_ad'
                    | 'direct' | 'ota_booking_com' | ...
  
  direction           'inbound' | 'outbound'
  
  // context
  content             String?     // message text (truncated)
  pageUrl             String?     // якщо website touchpoint
  campaignId          String?     // якщо ad click
  
  // attribution
  utmSource           String?
  utmMedium           String?
  utmCampaign         String?
  
  // cost (якщо ad_click)
  estimatedCost       Decimal?
  
  // related records
  inquiryId           String?     // якщо це ініціювало лід
  orderId             String?     // якщо відноситься до Замовлення
  messageId           String?     // якщо це повідомлення
  
  occurredAt          DateTime
  createdAt           DateTime
}
```

**Призначення:** єдиний лог усіх подій по гостю — для:
- Guest Journey visualization
- Attribution модель (first/last/linear/multi-touch)
- CAC / LTV calculation
- AI summary генерація (Phase 5)
- Troubleshooting ("чому цей гість не купив?")

## D.4 Як зібрати дані (по каналах)

### D.4.1 Telegram Bot
```
При /start → bot отримує:
  - user_id, username, first_name, last_name
  - start_param з deeplink: /start?start=utm_source=instagram_post_123
  
Парсимо start_param → UTM + create Touchpoint type='bot_interaction'
```

### D.4.2 Instagram Direct (Meta Graph API)
```
Webhook від Meta Messenger Platform:
  - user_id (page-scoped)
  - username (якщо public)
  - message content
  - timestamp
  - thread_id

Додатково через Conversions API: fbp, fbc cookies якщо прийшов через ad
```

### D.4.3 Website forms (Webflow + Cloudflare Worker)
```
JavaScript на Webflow сайті:
  - захоплює всі UTM з URL при першому візиті (localStorage)
  - захоплює _ga, _fbp, gclid, fbclid cookies
  - захоплює referrer, landing page, session context
  
При submit форми:
  - POST до Cloudflare Worker → RUTA CRM API
  - Всі поля записуються в Guest + Touchpoint
  
Якщо форма авторизована через messenger (Telegram Login Widget):
  - додатково telegram_user_id
```

### D.4.4 Ringostat (phone calls)
```
Call tracking працює так:
  - На сайті показується динамічний номер per source
  - Гість дзвонить → Ringostat reports:
    - Call ID, timestamp, source (UTM), session ID
    - Call recording URL
  
Webhook Ringostat → RUTA CRM:
  - Match guest by phone → update tracking fields
  - Create Touchpoint type='call', channel='phone'
  - Attribution: звідки прийшов (UTM зі сесії де набрав номер)
```

### D.4.5 Meta Ads (attribution + cost)
```
Через Meta Marketing API (daily cron):
  - Pull всіх active ads з ad account
  - Для кожної: spend, impressions, clicks, conversions
  
При створенні Guest з fbclid/fbp/fbc:
  - lookup у Meta Conversions API → знаходимо ad_id
  - записуємо ad_account_id, campaign_id, ad_set_id, ad_id
  
Computed:
  Guest.acquisitionCostEstimated = 
    ad.spend / ad.conversions 
    (тобто середня CPA на момент залучення)
```

### D.4.6 Google Ads / GA
```
На сайті:
  - GA4 _ga cookie → Guest.gaClientId
  - gclid в URL → Guest.gclid
  
Google Ads API (daily cron):
  - Match by gclid → отримуємо keyword, campaign, ad_group
  - Обчислюємо acquisitionCostEstimated
```

## D.5 Dashboard "Окупність трафіку" (для маркетолога)

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 ОКУПНІСТЬ ТРАФІКУ — Квітень 2026                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ВИТРАТИ ПО КАНАЛАХ:                                              │
│ ┌──────────────┬──────────┬──────────┬──────────┬────────────┐  │
│ │ Канал        │ Витрат   │ Гостей   │ Revenue  │ ROAS       │  │
│ │ Meta Ads     │ ₴ 50,000 │ 85       │ ₴345,000 │ 6.9x ✓    │  │
│ │ Google Ads   │ ₴ 30,000 │ 42       │ ₴189,000 │ 6.3x ✓    │  │
│ │ Instagram org│ ₴ 0      │ 28       │ ₴112,000 │ ∞          │  │
│ │ Telegram ch. │ ₴ 0      │ 15       │ ₴ 61,000 │ ∞          │  │
│ │ Direct/SEO   │ ₴ 0      │ 31       │ ₴124,000 │ ∞          │  │
│ │ Booking.com  │ ₴19,800  │ 22       │ ₴ 88,000 │ 4.4x       │  │
│ │            │(commission)│          │          │            │  │
│ └──────────────┴──────────┴──────────┴──────────┴────────────┘  │
│                                                                  │
│ ВАРТІСТЬ ЗАЛУЧЕННЯ:                                              │
│ ┌──────────────┬──────────┬──────────┬──────────┐               │
│ │ Канал        │ CPL      │ CPA      │ LTV/CAC  │               │
│ │ Meta Ads     │ ₴ 190    │ ₴ 588    │ 4.2x ✓   │               │
│ │ Google Ads   │ ₴ 250    │ ₴ 714    │ 3.8x ✓   │               │
│ │ Booking.com  │ ₴ 900    │ ₴ 900    │ 2.1x ⚠   │               │
│ └──────────────┴──────────┴──────────┴──────────┘               │
│                                                                  │
│ TOP-5 КАМПАНІЙ:                                                  │
│ 1. "Весняне раннє бронювання" — ROAS 8.2x (₴125k revenue)        │
│ 2. "Family Weekend" — ROAS 7.1x                                  │
│ 3. "VIP реактивація" — ROAS 15.3x (найефективніше!)              │
│                                                                  │
│ [Drill down by campaign →]  [Експорт Excel]                      │
└─────────────────────────────────────────────────────────────────┘
```

## D.6 GDPR та приватність

- **Data minimization:** не збираємо raw IP, тільки хеш
- **Purpose limitation:** фікцуємо в консенті для чого використовуємо
- **Right to deletion:** `gdprDeletionRequested = true` → soft-delete + видалення tracking полів
- **Consent UI:** при першому контакті — бот шле permission запит
- **Data export:** гість може запросити всі дані через portal (Phase 4+)

---

# ЧАСТИНА E — Оновлення roadmap (лише зміни до v2.5)

## E.1 Phase 1 — додано

- Базова модель Guest з tracking fields (UTM first/last, telegram IDs)
- Touchpoint entity створюється automatically при inbound
- Простий dashboard "Окупність" (без ad-platform APIs ще)

## E.2 Phase 2 — додано

- Post-stay дзвінок task для Фермера (обов'язковий T+2)
- Full retention cycle з Фермер-driven touchpoints
- Certificate creation на 3-й / 5-й візит

## E.3 Phase 3 — додано

- Pricing engine: BAR + акції + сертифікати з cascade
- Revenue Manager UI для тарифів та акцій
- Multi-period stay support (split nightly pricing)
- Meta Ads API integration → attribution
- Google Ads API → acquisitionCost

## E.4 Phase 4 — додано

- GDPR portal (right to export, right to delete)
- Full "Окупність трафіку" dashboard
- Multi-touch attribution models

## E.5 Phase 5 — додано

- AI для аналізу patterns у touchpoints
- AI-recommended promo creation (based on patterns)

---

# ЧАСТИНА F — Файли v2.x (фінальний зведений стан)

**Збережено (повністю):**
- `RUTA_CRM_v2_5_MASTER.md` — головний документ зі всіма частинами
- `RUTA_CRM_v2_5_WIREFRAMES.md` — ASCII-інтерфейси

**Додано:**
- `RUTA_CRM_v2_6_ADDENDUM.md` — цей документ

**Всі попередні (архів):**
- v1.0 Doc 1/2/3 (research, UX spec, implementation)
- v2.0-v2.4 structure documents

---

# РЕЗЮМЕ v2.6

| Область | Що додано |
|---|---|
| **Шлях В** | Фермер центральна роль, обов'язковий T+2 call, повний retention cycle T+0→T+180 |
| **Ціноутворення** | BAR + акції + сертифікати, cascade order, 4 corner cases (multi-period, room-change, overlap, cert>total) |
| **UX принципи dev** | 26 pragmatic principles для solo dev: Server Components, Server Actions, Zod, Shadcn, feature flags, monitoring |
| **Модель Guest** | 40+ нових полів для tracking: UTMs, Google stack, Meta stack, messenger IDs, Ringostat, consent |
| **Нова сутність** | `Touchpoint` — лог усіх взаємодій для attribution |
| **Dashboard** | "Окупність трафіку" для маркетолога з ROAS/CPA/LTV:CAC |

**Все з v2.5 (MASTER + WIREFRAMES) збережено без змін.**

**Наступний крок:**
1. ✅ OK → готую Doc 1/2/3 v2.6 імплементаційні (Prisma schema з усім tracking, Server Actions, компоненти, 26 dev principles — закодовано у CLAUDE.md для IT-компанії)
2. Або → перший Claude Code prompt для Phase 1 setup

Який крок?
