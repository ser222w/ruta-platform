# Business Rules — Ruta OS

## Hotels

```typescript
export const HOTELS = [
  { id: 'polyana',     name: 'Рута Резорт Поляна',    rooms: 118, region: 'carpathians' },
  { id: 'polianytsia', name: 'Рута Резорт Поляниця',  rooms: 51,  region: 'carpathians' }, // NEVER confuse!
  { id: 'zatoka',      name: 'Сонячна Поляна Затока', rooms: null, region: 'coast' },      // seasonal
  { id: 'terasa',      name: 'Вілла Тераса',          rooms: null, region: 'misc' },
] as const;
```

**Polyana ≠ Polianytsia** — different properties, different slug, different P&L. NEVER confuse.

---

## Pricing — 3-layer cascade

```
1. BAR (тариф × ніч × тип номера)     → accommodation_total
2. MEAL PLAN                            → meal_total
3. SERVICES (SPA, transfer)            → services_total
4. SUBTOTAL = accommodation + meal + services
5. MANAGER DISCOUNT (якщо > 10% → блокер, потрібен апрув)
6. FINAL_TOTAL
7. CERTIFICATE (зменшує суму до сплати, не знижка)
   payment_due = max(0, final_total - cert_amount)
8. PREPAYMENT: payment_due × prepay_pct (за сегментом)
9. BALANCE = payment_due - prepayment
```

### Split nightly pricing
Для кожної ночі окремо знаходимо BAR + best promo. Сумуємо.
(Гість 21-25 квітня через сезони = різні BAR)

### Prepayment % by segment
- NEW → 50%
- FRIEND → 30%
- FAMILY → 30%
- VIP → 20%

### Promo selection (якщо кілька eligible)
1. Фільтр: property, roomType, дати, minNights, minGuests, channel, advanceDays, guestSegment, blackoutDates
2. Обираємо найвигіднішу для гостя (найнижча ціна/ніч)
3. При рівній ціні → вищий priority wins
4. При рівному priority → старіша (createdAt ASC)
5. Акції НЕ комбінуються (якщо `isStackable != true`)

---

## Loyalty Tiers

```
NEW:    visitCount == 0
FRIEND: 1 ≤ visitCount < 5   (auto after first CHECKOUT)
FAMILY: 5 ≤ visitCount < 10
VIP:    visitCount ≥ 10 OR manual assignment
```

### Loyalty discounts
- FRIEND: 5%
- FAMILY: 10%
- VIP: 15%

---

## Certificate Rules

- 3rd visit → auto ₴6,000 (FAMILY segment assign)
- 5th visit → auto ₴10,000 + VIP status
- Birthday → auto ₴3,000
- Valid 6 months
- `certificate > final_total` → use final_total, remainder stays active
- Reduces `payment_due`, not `final_total` (not a discount)

---

## Booking Number Format

`P{YY}{MM}{DD}{NNN}` — e.g., `P260416001` (year=26, month=04, day=16, sequence=001)

---

## Payment Tranches

Default: 30% prepay + 70% balance before checkin. Configurable per booking.

**No Folio entity** (ADR-002 decision):
Settlement = computed: `sum(charges) - sum(payments WHERE status=SUCCEEDED)`

---

## Stage Transition Rules

- Lead → Opportunity: call recorded by Ringostat (duration > 0)
- Unqualified lead: archived, not counted in conversion
- `PREPAYMENT`: payment received → auto-assign Farmer + create "Handoff" activity
- `CHECKOUT` → `visits_count++`, loyalty tier recalc, new retention lead, "Get feedback" activity

---

## Post-Checkout Automation (T+0)

```
CHECKOUT → visitCount++ → segment recalc → certificate if 3rd/5th
→ Task для Farmer: "Послідовний дзвінок" (T+2)
→ Telegram гостю: NPS запит
→ якщо NPS < 7 → escalation до керівника
→ Winback якщо > 6 міс тиші
```

---

## User Journeys

### Path A: Chat → Payment (Closer, ≤5 clicks, ≤90 sec)
```
Вхідне звернення (Telegram/WhatsApp/Instagram)
→ Webhook → Inquiry(NEW) → auto-assign Closer
→ Менеджер відкриває чат → відповідає → [Створити замовлення]
→ Форма Booking: гість + номер + тариф → ціна auto-calc
→ [Сформувати рахунок] → PaymentSchedule → tokenized URL
→ [Надіслати посилання] → гість платить
→ Webhook payment → stage=PREPAYMENT → auto-assign Farmer
```

### Path B: Call → Payment (Closer, ≤3 clicks, ≤60 sec)
```
Ringostat webhook → incoming call
→ Screen pop: "Olena K., 3 заїзди, LTV ₴42k"
→ Booking auto-created (stage=QUALIFY), форма відкрита
→ Під час дзвінка: менеджер заповнює дати + номер
→ ⌘Enter → [Сформувати + надіслати]
→ MANDATORY Wrap-up (summary 10+ слів + результат)
```

### Path C: Farmer Retention (T+0 → T+180)
```
CHECKOUT → auto-tasks → T+2 "Послідовний дзвінок" → Wrap-up → next Task
→ T+7-14 персональна пропозиція → якщо "yes" → Шлях A
→ T+30/60/90 seasonal trigger
→ T+180 Winback (якщо мовчання)
```

---

## Terminology (UI укр. ↔ Code EN)

| UI (укр.) | Code (en) | Примітка |
|---|---|---|
| Звернення | Inquiry | Raw вхідний контакт |
| Замовлення | Booking/Order | Основна сутність |
| Нарахування | Charge | Рядок витрат гостя |
| Оплата | Payment | Один платіж |
| Графік оплат | PaymentSchedule | Коли скільки платити |
| Взаєморозрахунки | settlement tab | Charges + Payments (без Folio!) |
| До сплати | settlement (computed) | sum(charges) - sum(payments) |
| Акція | Promo | Правило знижки з умовами |
| Базова ціна | BAR | Best Available Rate |
| Сертифікат | Certificate | Money voucher |
| Платник | Payer | Фізособа або юрособа |
| Компаньйон | OrderCompanion | Хто їде з гостем |
| Передача гостя | Handoff | Closer → Farmer event |
| Задача | Task | Actionable item з deadline |
| Наступна дія | nextAction | Обов'язкова дія на картці |
| Підсумкова форма | Wrap-up | Обов'язкова після дзвінка |
| Завершення дня | EOD Mission | 0 unprocessed/overdue/без action |
| Сегмент гостя | Segment | NEW / FRIEND / FAMILY / VIP |
| Журнал змін | AuditLog | Audit trail |
| Повернення гостя | Winback | Активація після 6+ міс тиші |

---

## KeyCRM Migration Note

Order date = FIRST PAYMENT date (never order creation date).
