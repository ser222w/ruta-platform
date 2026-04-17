# RUTA CRM — Specification v2.7 (Addendum до v2.5 + v2.6)
## Компаньйони, ДН, документи, платники

**Дата:** 17 квітня 2026  
**Статус:** v2.5 + v2.6 зберігаються повністю. Цей документ — лише доповнення.  
**Синхронізація:** узгоджено з P16 (save blockers), P20 (audit everything), GDPR частиною v2.6.

---

# ЧАСТИНА A — Розширена модель Гостя

## A.1 Нові поля в `Guest`

```
Guest {
  ... (всі поля з v2.6)
  
  // ── ДАТА НАРОДЖЕННЯ ──
  birthDate              DateTime?   // для привітань + legal при check-in
  birthDateSource        enum ['manual', 'check_in', 'guest_portal']
  
  // ── АДРЕСА (для документів / податкових накладних) ──
  addressCountry         String?     // 'UA' за замовчуванням
  addressRegion          String?     // область
  addressCity            String?
  addressStreet          String?
  addressPostalCode      String?
  
  // ── ДОКУМЕНТ ОСОБИ (sensitive!) ──
  documentType           enum ['passport_ua', 'id_card', 'foreign_passport',
                                'birth_certificate']?
  documentNumber         String?     // шифрований at rest
  documentIssuedBy       String?     // орган видачі
  documentIssuedAt       DateTime?
  documentExpiresAt      DateTime?   // для закордонного паспорту
  
  // ── РОДИННИЙ СТАН (опціонально, для персоналізації) ──
  maritalStatus          enum ['single', 'married', 'unknown']?
  
  // ── RELATIONS ──
  relations              GuestRelation[]   // NEW (див A.2)
  companionsHistory      OrderCompanion[]  // NEW (див A.3)
  payersAsIndividual     Payer[]           // якщо цей гість платить за інших
}
```

## A.2 Нова сутність `GuestRelation` — стосунки між гостями

```
GuestRelation {
  id                String
  
  guestId           String             // основний гість
  guest             Guest @relation("guest", ...)
  
  relatedGuestId    String             // компаньйон-гість
  relatedGuest      Guest @relation("related", ...)
  
  relationType      enum ['spouse',        // дружина / чоловік
                           'partner',       // громадянський партнер
                           'child',         // дитина
                           'parent',        // батько / мати
                           'sibling',       // брат / сестра
                           'friend',        // друг
                           'colleague',     // колега
                           'other']
  
  relationNote      String?            // "донечка Даринка", "мама", "друг зі студентства"
  
  anniversaryDate   DateTime?          // для подружжя — дата весілля (річниця)
  
  source            enum ['manual_input',           // менеджер ввів
                           'check_in_registration',   // з документів при заїзді
                           'inferred_from_bookings',  // система зрозуміла з 2+ спільних Orders
                           'guest_portal_self']       // гість сам вказав
  
  isConfirmed       Boolean  @default(false)  // чи підтверджено (vs inferred)
  
  createdAt         DateTime
  updatedAt         DateTime
  
  @@unique([guestId, relatedGuestId, relationType])
}
```

**Як будуються:**
- При check-in admin заносить компаньйонів → створює `GuestRelation` для кожного
- Якщо компаньйон вже є в системі → linking (dedup за phone/email)
- Система `inferred_from_bookings`: якщо у 2+ Orders один `mainGuest` + один і той самий `companion` → автоматична пропозиція "Може, це родич? Вкажіть відношення"

## A.3 Нова сутність `OrderCompanion` — компаньйони в одному Замовленні

**Проблема:** компаньйон може бути:
1. Зареєстрований гість у системі (Ivan, якого ми вже знаємо)
2. Просто "людина з документами" що приїздить (дитина без email)

Модель обробляє обидва випадки:

```
OrderCompanion {
  id                String
  
  orderId           String
  order             Order @relation
  
  // Якщо компаньйон вже зареєстрований як Guest — лінк:
  guestId           String?
  guest             Guest? @relation
  
  // Інакше — standalone дані:
  firstName         String
  lastName          String?
  birthDate         DateTime?         // для дітей важливо
  isChild           Boolean  @default(false)
  ageAtStay         Int?              // computed при створенні
  
  // Document (для реєстрації поселення):
  documentType      enum ['passport_ua', 'id_card', 'foreign_passport',
                           'birth_certificate']?
  documentNumber    String?            // шифрований
  
  // Відношення до головного гостя:
  relationToMainGuest  enum ['self',        // головний гість
                               'spouse',
                               'partner',
                               'child',
                               'parent',
                               'sibling',
                               'friend',
                               'colleague',
                               'other']
  
  relationNote      String?            // "донечка Даринка, 8 років"
  
  isMainGuest       Boolean  @default(false)   // головний гість Order
  isPaymentHolder   Boolean  @default(false)   // чи цей компаньйон = платник
  
  createdAt         DateTime
}
```

**Логіка:**
- При створенні Order з dashbard — вибираємо головного гостя (isMainGuest=true)
- При check-in — admin додає всіх компаньйонів
- Для кожного компаньйона — якщо у нас вже є Guest з таким phone/email → лінк
- Інакше — standalone OrderCompanion

**При наступному Order від того ж головного гостя:**
- Система підказує: "Останній раз ви їздили з Ivan і Daryna. Їдете разом?"
- Одним кліком компаньйони копіюються в новий Order (з оновленням віку дітей)

---

# ЧАСТИНА B — Платники (Payer)

## B.1 Три типи платника

```
Order.payerType:
  ├─ SAME_AS_GUEST      — гість платить сам (дефолт)
  ├─ INDIVIDUAL         — інша фізособа (наприклад, чоловік платить за дружину)
  └─ LEGAL_ENTITY       — юрособа (корпоративний відпочинок, ЄДРПОУ, B2B)
```

## B.2 Нова сутність `Payer`

```
Payer {
  id                String
  
  type              enum ['INDIVIDUAL', 'LEGAL_ENTITY']
  
  // ── ДЛЯ ФІЗОСОБИ ──
  firstName         String?
  lastName          String?
  phone             String?
  email             String?
  documentNumber    String?   // ІПН (необов'язково)
  
  // ── ДЛЯ ЮРОСОБИ ──
  companyName               String?          // "ТОВ Kovalenko Consulting"
  companyType               enum ['TOV', 'FOP', 'PP', 'AT', 'OTHER']?
  edrpouCode                String?          // 8-значний ЄДРПОУ
  vatNumber                 String?          // 12-значний ІПН
  isVatPayer                Boolean  @default(false)  // платник ПДВ?
  
  // Адреса
  legalAddress              String?
  actualAddress             String?          // фактична адреса (якщо відрізняється)
  
  // Банк
  bankAccountIban           String?          // IBAN (29 символів)
  bankName                  String?
  bankMfo                   String?          // МФО банку
  
  // Контактна особа
  contactPersonName         String?
  contactPersonPosition     String?          // "Бухгалтер", "Директор"
  contactPersonPhone        String?
  contactPersonEmail        String?
  
  // ── ЗВ'ЯЗКИ ──
  orders                    Order[]          // Orders, що ця особа оплачує
  invoicesIssued            Invoice[]        // виставлені рахунки-фактури
  
  // ── МЕТАДАНІ ──
  createdAt                 DateTime
  updatedAt                 DateTime
  createdByUserId           String           // хто додав
  linkedGuestId             String?          // якщо platник = гість, лінк
}
```

## B.3 Order з Payer reference

```
Order {
  ... (існуючі поля)
  
  payerType       enum [SAME_AS_GUEST, INDIVIDUAL, LEGAL_ENTITY]
  payerId         String?          // якщо INDIVIDUAL/LEGAL_ENTITY — лінк на Payer
  payer           Payer? @relation
  
  invoiceNumber   String?          // номер рахунку-фактури (генерується при потребі)
  invoiceIssuedAt DateTime?
}
```

## B.4 Логіка

**Якщо `payerType = SAME_AS_GUEST`:**
- Немає Payer запису
- Документи (рахунок-фактура) виставляються на гостя
- Використовується `Guest.addressCity`, `Guest.firstName`, etc.

**Якщо `payerType = INDIVIDUAL`:**
- Окремий Payer запис (фізособа)
- Документи на цю фізособу
- Можна переваге-юзати (якщо Guest уже в системі — один клік linking)

**Якщо `payerType = LEGAL_ENTITY`:**
- Окремий Payer запис (юрособа)
- Документи на юрособу
- Рахунок-фактура з ЄДРПОУ + ІПН
- Автоматично генерується нумерація рахунків (INV-2026-04-0123)
- ПДВ обчислюється якщо юрособа — платник ПДВ

## B.5 ASCII: вибір платника в Order card

```
┌──────────────────────────────────────────────────────┐
│ [Запит] [Взаєморозрахунки] [Заїзд] [Комунікації]     │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ГОСТІ                                                  │
│ 👤 Olena K. (головний)                                │
│ 👤 Ivan K. (чоловік)                                  │
│ 👶 Darynka K. (доня, 8 р.)                            │
│                                                       │
│ ── ПЛАТНИК ──                                         │
│                                                       │
│ Хто оплачує?                                          │
│ ○ Olena K. (гість)                                    │
│ ○ Інша фізособа                                       │
│ ◉ Юридична особа                                      │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ 🏢 ТОВ "Kovalenko Consulting"                   │   │
│ │ ЄДРПОУ: 12345678                                │   │
│ │ ІПН:    123456712345                            │   │
│ │ Платник ПДВ: ✓                                  │   │
│ │ Адреса: Київ, Шевченка 12                       │   │
│ │ IBAN: UA12 3052 9900 0000 0260 0123 4567 8      │   │
│ │ Контакт: Ivan К., 0671234567                    │   │
│ │                                                  │   │
│ │ [Редагувати]  [Інший платник]                   │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ⚠ Для юрособи — ПДВ нараховується автоматично         │
│                                                       │
│ [📄 Виставити рахунок-фактуру]                       │
└──────────────────────────────────────────────────────┘
```

---

# ЧАСТИНА C — Автоматизація привітань з ДН

## C.1 Ціль

**Використати ДН гостей + компаньйонів** для персональних привітань. Це один з найпотужніших retention-інструментів (конверсія знижки на ДН в 3-5× вища за звичайну розсилку).

## C.2 Логіка тригера

```
Daily cron at 09:00:

1. Знайти всі дні народження сьогодні (day + month match, year ignore):
   a) Guest.birthDate (головні гості)
   b) OrderCompanion.birthDate (члени родини з минулих заїздів)
   c) GuestRelation.anniversaryDate (річниці подружжя)

2. Для кожного match:
   - Визначити головного гостя (mainGuest)
   - Визначити кого вітаємо (self / spouse / child / friend)
   - Визначити вік ювіляра (якщо birthDate з роком)

3. Створити задачу для відповідного Фермера:
   - Тип: BIRTHDAY_GREETING
   - Due: сьогодні до 18:00
   - Template pre-filled (гостю підставляються дані)

4. Якщо Фермер не обробив до 17:00 → auto-send шаблон
   (але краще щоб Фермер персонально)
```

## C.3 Шаблони привітань

### C.3.1 ДН самого гостя
```
[Тема] З днем народження, Olena! 🎂

Olena, дорога,

Від усієї команди RUTA Group вітаємо Вас з днем народження!

Нехай цей рік буде сповнений радісних подій, здоров'я і, звісно,
яскравих відпочинкових подорожей.

🎁 На честь Вашого свята даруємо сертифікат ₴ 3,000 на наступний
    відпочинок у будь-якому з наших готелів (дійсний 6 місяців).

З найкращими побажаннями,
Ваш персональний менеджер Vadym
```

### C.3.2 ДН компаньйона (дитини)
```
[Тема] Даринці сьогодні 9! 🎂 Вітаємо, Olena

Olena,

Пам'ятаємо як минулого літа Даринка бігала по подвір'ю готелю
з усміхом — і сьогодні їй вже 9! Вітаємо Вашу сонячну донечку
з днем народження 🎈

Якщо плануєте святкувати — нашу вечерю можемо підготувати
спеціально (тортик з фруктами вона полюбила).

🎁 Даринці — безкоштовні SPA-процедури для дітей під час наступного
    відпочинку (до 12 років).

Vadym
```

### C.3.3 Річниця подружжя
```
[Тема] 10 років разом! Вітаємо, Olena та Ivan

Дорогі Olena та Ivan,

10 років — це про любов, довіру і спільні спогади. Вітаємо Вашу
сім'ю з цією важливою датою!

🎁 До Вашого наступного візиту — безкоштовний романтичний
    сніданок у номер + пляшка вина.

Vadym
```

## C.4 ASCII: Задача "Привітати з ДН"

```
┌──────────────────────────────────────────────────┐
│ 🎂 ЗАДАЧА: Привітати з днем народження            │
│ Сьогодні 17 квітня                               │
├──────────────────────────────────────────────────┤
│                                                   │
│ ЮВІЛЯР: Даринка Kovalenko                        │
│ Вік: 9 років (сьогодні!)                          │
│                                                   │
│ ГОЛОВНИЙ ГІСТЬ: Olena K. (мама)                   │
│ Сегмент: FAMILY · LTV ₴42,000                    │
│ Останній візит: 12-15 травня 2025                 │
│ Їздила з: Ivan (чоловік), Даринка (донька)       │
│                                                   │
│ ОСТАННІЙ КОНТАКТ: 12 днів тому                    │
│                                                   │
│ ── ШАБЛОН (готовий, можна редагувати) ──          │
│ ┌──────────────────────────────────────────────┐ │
│ │ Olena, пам'ятаємо як минулого літа Даринка   │ │
│ │ бігала по подвір'ю готелю з усміхом...       │ │
│ │ ...                                          │ │
│ │                                              │ │
│ │ Даринці — безкоштовні SPA-процедури для       │ │
│ │ дітей під час наступного відпочинку.          │ │
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ [✏ Персоналізувати]                              │
│                                                   │
│ Надіслати через:                                  │
│ ◉ Telegram  ○ WhatsApp  ○ Email                  │
│                                                   │
│ [📤 Надіслати]  [⏱ Відкласти на 1 год]           │
└──────────────────────────────────────────────────┘
```

## C.5 Корнер кейси

- **Два ДН в один день:** одна задача, обидва ювіляри згадані
- **ДН під час заїзду:** окрема високопріоритетна задача, не чекає Фермера — адмін рецепції вітає особисто + торт від готелю (якщо бюджет)
- **Гість без ДН у базі:** ігнорується, відсутність даних не блокує
- **Компаньйон без birthDate:** не тригериться

---

# ЧАСТИНА D — Швидке заселення з документами

## D.1 Legal requirements (UA)

За законом про готельний бізнес, при реєстрації поселення готель збирає:
- ПІБ повне
- Серія/номер паспорту
- Орган видачі
- Дата видачі
- Адреса проживання
- Підпис гостя

Ці дані **зберігаються 3 роки** (за GDPR + UA закон).

## D.2 Швидке заселення (Phase 2+)

**Мета:** за ≤2 хвилини admin збирає все про всіх гостей.

```
┌──────────────────────────────────────────────────────┐
│ ⚡ ШВИДКЕ ЗАСЕЛЕННЯ                                   │
│ Замовлення #1247 · Ruta Polyana · Family Room A-201  │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 📋 Гості до заселення (з замовлення):                │
│                                                       │
│ #1 ГОЛОВНИЙ ГІСТЬ ────────────────────────────       │
│ ┌──────────────────────────────────────────────┐    │
│ │ Olena Kovalenko                               │    │
│ │                                               │    │
│ │ [✓] Дані з попереднього візиту (травень 2025)│    │
│ │                                               │    │
│ │ Паспорт:    [ФА 123456          ]            │    │
│ │ Видан:      [01.03.2015          ]            │    │
│ │ Ким:        [Васильків. РВ ГУ МВС]            │    │
│ │ ДН:         [15.06.1985          ]            │    │
│ │ Адреса:     [Київ, Шевченка 12-45]            │    │
│ │                                               │    │
│ │ [Зберегти і далі ▼]                           │    │
│ └──────────────────────────────────────────────┘    │
│                                                       │
│ #2 КОМПАНЬЙОН ─────────────────────────────         │
│ ┌──────────────────────────────────────────────┐    │
│ │ Обрати зі списку попередніх візитів:          │    │
│ │ ○ Ivan Kovalenko (чоловік, минулий візит)     │    │
│ │ ○ Darynka Kovalenko (донька, 9 р.)            │    │
│ │ ○ Додати нового                                │    │
│ └──────────────────────────────────────────────┘    │
│                                                       │
│ [Зберегти все і заселити]                            │
│                                                       │
│ ── АВТО-ДІЇ ПІСЛЯ ЗАСЕЛЕННЯ ──                       │
│ ✓ Order.stage → CHECKED_IN                            │
│ ✓ Інформація для Housekeeping                         │
│ ✓ Вибір часу check-out (автоматично +24 до виїзду)   │
│ ✓ Запит про побажання (opt-in)                       │
└──────────────────────────────────────────────────────┘
```

## D.3 Якщо гість НЕ має документів у базі

При першому візиті — заповнюємо з нуля. Claude Code підказує як зробити форму максимально швидкою:
- Parseable фотографування паспорту (Phase 4+ — OCR)
- Auto-fill полів (регіон за індексом, і т.д.)
- Mandatory fields mark червоним

## D.4 Безпека документів

**Sensitive fields (passport + document + address):**

- **Encryption at rest:** Prisma field-level encryption для `documentNumber`
- **Access log:** кожен read → AuditLog entry
- **RBAC:**
  - Full read: Admin, CEO, Receptionist (тільки своїх гостей), Accountant (для документів)
  - No read: Acquisition, Farmer, Marketer, Sales Head, Revenue Manager
- **Export restrictions:** PII не включається у звичайні Excel exports
- **Retention:** auto-purge after 3 years (UA закон)
- **GDPR deletion:** якщо гість запросив видалення → documents видаляються першими

---

# ЧАСТИНА E — Картка Замовлення — вкладка "Заїзд" (оновлена)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Запит] [Взаєморозрахунки] [Заїзд ●] [Комунікації] [Маркетинг]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ГОСТІ У ЗАМОВЛЕННІ (3)                                           │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 Olena K. (головний · платник)                            │ │
│ │ 38 років · ДН 15.06 (через 59 днів 🎂)                      │ │
│ │ Документ: ✓                                                  │ │
│ │ Адреса: Київ                                                 │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 👤 Ivan K. (чоловік)                                         │ │
│ │ 40 років · ДН 22.11 · 🎊 річниця весілля з Olena: 12 вер.   │ │
│ │ Документ: ✓                                                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 👶 Darynka K. (донька, 8 років)                              │ │
│ │ ДН 03.09 · через 4 міс їй буде 9 🎂                          │ │
│ │ Свідоцтво про народження: ⚠ не додано                        │ │
│ │ [+ Додати документ]                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Додати гостя]  [Підвантажити з попередніх візитів]           │
│                                                                  │
│ ── ПЛАТНИК ──                                                    │
│ ◉ Сам головний гість (Olena K.)                                 │
│ ○ Інша фізособа                                                  │
│ ○ Юрособа                                                        │
│                                                                  │
│ ── ПОБАЖАННЯ ──                                                  │
│ · Тихий номер                                                    │
│ · Вид на гори (останнього разу було A-201 — заберемо знову?)    │
│ · Пізній сніданок (9:30+)                                        │
│ · Дитячий набір у номер                                          │
│                                                                  │
│ ── AUTOMATIC REMINDERS ──                                        │
│ ℹ Через 4 місяці Darynka має 9 років — автоматичне привітання  │
│ ℹ Річниця весілля 12 вересня — задача для Vadym                │
│                                                                  │
│ [📄 Роздрукувати форму реєстрації для всіх]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

# ЧАСТИНА F — Impacts на інші частини

## F.1 Guest Portal (Phase 4+) — нові функції

У `/g/[token]` гість може:
- Оновити свій ДН + ДН компаньйонів (якщо забули додати при check-in)
- Додати паспортні дані наперед (щоб скоротити check-in)
- Підтвердити/змінити відношення з компаньйонами
- Вказати побажання для конкретних людей (Darynka love tortes, Ivan prefers ski)

## F.2 Revenue Dashboard (Revenue Manager)

Нові можливості сегментації:
- "Сімейні гості" (з дітьми): середній check, preferred weeks, conversion
- "Couples" (без дітей): різниця в ADR, upsell rates
- "B2B (юросіб)": частка в revenue, середній check, payment terms

## F.3 Marketing Dashboard

Нові когорти:
- Гості з дітьми (за наявністю companions isChild=true)
- B2B vs B2C розмежування
- Birthday-driven revenue (окупність auto-привітань)

## F.4 Retention Campaigns

Нові типи:
- `BIRTHDAY_GUEST` — ДН головного гостя
- `BIRTHDAY_COMPANION` — ДН члена родини
- `ANNIVERSARY_WEDDING` — річниця весілля (якщо дані є)
- `ANNIVERSARY_FIRST_VISIT` — річниця першого візиту (з v2.5)

---

# ЧАСТИНА G — Оновлений roadmap

## Phase 1 (MVP)
- Базові Guest fields (без документів ще)
- ✨ `birthDate` як опціональне поле
- Manual companions у Order (без окремої сутності GuestRelation поки)
- payerType enum у Order, але без Payer entity ще

## Phase 2 (після MVP)
- `GuestRelation` сутність + дедуплікація companions
- "Привітати з ДН" як automated task (базова)
- Birthday greetings templates
- Payer entity + INDIVIDUAL type
- Шаблони привітань базові

## Phase 3 (Scale)
- LEGAL_ENTITY Payer з ЄДРПОУ/ІПН/IBAN
- Автоматична генерація рахунків-фактур
- Швидке заселення UI для рецепції
- Document management з шифруванням
- Audit log для sensitive data access
- Автоматика нумерації документів

## Phase 4 (Polish)
- OCR паспортів для швидкого вводу (QR/скан)
- Guest Portal self-service для даних
- Wedding anniversary tracking
- GDPR export + deletion для гостей
- Advanced segmentation dashboards

## Phase 5 (AI)
- AI-generated birthday messages (персональні з історії гостя)
- AI-predicted companions (якщо гість бронює сімейний номер — запитати про компаньйонів)
- AI-detected relationships (pattern у bookings → suggest relationship)

---

# ЧАСТИНА H — Updated меню (доповнення для Адміна рецепції)

```
👤 Адміністратор рецепції (оновлено)

📊 Сьогодні
...

── 🏨 ФРОНТ ДЕСК ──
🏨 Заселення
   ├ Сьогодні очікувані
   ├ Вже заселились
   ├ Потребують документів ●   ← NEW
   └ [⚡ Швидке заселення]

🚪 Виїзди
   ├ Сьогодні очікувані
   ├ Вже виїхали
   ├ Late check-out
   └ Фіналізація Рахунку

📅 Календар — повний для свого готелю

── 👥 ГОСТІ ──
👥 Гості
   ├ Зараз у готелі
   ├ Очікуються
   ├ Виїзди
   ├ 🎂 З ДН сьогодні ●           ← NEW
   └ Пошук

👨‍👩‍👧 Родини                       ← NEW розділ
   ├ Часті компаньйони
   ├ Родинні шаблони
   └ Додати відношення

...

── 🎁 ПРИВІТАННЯ ──                   ← NEW
🎂 Мої задачі на сьогодні
   ├ ДН гостей (2)
   ├ ДН дітей (1)
   ├ Річниці подружжя (0)
   └ Перший візит річниці (1)

...
```

---

# ЧАСТИНА I — Принципи обробки sensitive даних (захист)

**Zero-trust підхід для документів:**

- **Encryption at rest:** `documentNumber`, `documentIssuedBy`, `addressStreet` — шифровані через Prisma middleware
- **Encryption in transit:** HTTPS everywhere (Cloudflare + Vercel)
- **Access control:**
  - Readable only by: Admin, CEO, Receptionist (свій готель), Accountant (для документів)
  - Never visible to: Acquisition, Farmer, Marketer, Sales Head, Revenue Manager
  - UI labels show `••••••6789` замість повного номера документа для ролей з limited access
- **Audit log:** кожен `SELECT documentNumber` → AuditLog entry з userId + reason
- **Export restrictions:** документи не включаються у звичайні Excel/CSV exports
- **Retention:** 3 роки після CHECKED_OUT → auto-purge через cron (UA закон + GDPR)
- **GDPR right to deletion:** при запиті — документи видаляються першими, до всього решта
- **Backups:** зашифровані, окремий ключ
- **Пшифрування відповідно до ДСТУ 7564:2014** (український стандарт)

---

# РЕЗЮМЕ v2.7

| Додано | Опис |
|---|---|
| **Guest.birthDate + адреса** | Для привітань + документів |
| **Guest.documentNumber** | Для реєстрації поселення (sensitive, encrypted) |
| **GuestRelation** | Зв'язки між гостями (подружжя, діти, друзі) |
| **OrderCompanion** | Хто їде в конкретному Замовленні |
| **Payer entity** | Фізособа або юрособа (ЄДРПОУ, ІПН, IBAN) |
| **Birthday automation** | Auto-задачі Фермеру з шаблонами (3 сценарії) |
| **Швидке заселення UI** | <2 хвилини замість ~10 зараз в Servio |
| **Revenue Manager benefits** | Нова сегментація (з дітьми / couples / B2B) |
| **Retention campaigns** | +3 типи (ДН гостя, ДН компаньйона, річниця) |
| **Safety** | Encryption + access control + audit + GDPR retention |

**Стан документації:**
- `RUTA_CRM_v2_5_MASTER.md` — зберігається
- `RUTA_CRM_v2_5_WIREFRAMES.md` — зберігається
- `RUTA_CRM_v2_6_ADDENDUM.md` — зберігається (pricing, UX dev, tracking)
- `RUTA_CRM_v2_7_ADDENDUM.md` — цей документ (companions, ДН, документи, платники)

**Наступний крок:**
1. ✅ OK → готую повні Doc 1/2/3 v2.7 з імплементацією (всі entities включно з GuestRelation + OrderCompanion + Payer + шифруванням + 26 dev принципів закодовано у CLAUDE.md)
2. Або → перший Claude Code prompt для Phase 1 setup

Який крок?
