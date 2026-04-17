# PRINCIPLES.md — Принципи розробки та продукту RUTA Business OS

**Автор:** Сергій Корін, CEO RUTA Group
**Версія:** 1.0
**Призначення:** Цей документ — фільтр рішень. Перед кожним product/dev рішенням — звір з принципами. Якщо рішення суперечить принципу — потрібна явна причина чому робимо виняток.

---

## Частина 1: Принципи продукту

### P1. Видалити → Автоматизувати → Доручити людині

Кожен процес проходить через три фільтри у суворому порядку:

| Пріоритет | Дія | Приклад |
|---|---|---|
| **1 (найвищий)** | **Видалити** — чи цей процес взагалі потрібен? Чи можна прибрати крок повністю? | Менеджер вручну вносить дзвінок у CRM → видалити: Ringostat webhook створює запис автоматично, людина не задіяна |
| **2** | **Автоматизувати** — якщо процес потрібен, чи може система зробити його без людини? | Перевірка якості дзвінка → автоматизувати: STT + AI grading оцінює 100% дзвінків, а не 5% вибірково людиною |
| **3 (найнижчий)** | **Доручити людині** — тільки якщо рішення вимагає judgment, емпатії або контексту, який система не має | Гість просить нестандартну конфігурацію номерів → людина вирішує, система підготувала всю інформацію |

**Тест:** Перед тим як додати поле у форму, кнопку в UI, або крок у процесі — запитай: "А чи потрібен цей крок взагалі? Хто його буде натискати і навіщо?" Якщо відповідь нечітка — не додавай.

### P2. Система працює, люди вирішують

> System does, humans decide.

Система виконує всю рутину: створює записи, рахує KPI, надсилає нагадування, класифікує ліди, генерує payment links. Людина підключається лише у точках рішень: підтвердити ціну, вирішити спір, обрати стратегію. 

**Практично:**
- Якщо менеджер робить одну й ту саму дію 10+ разів на день — це кандидат на автоматизацію
- UI має показувати рекомендацію ("Рекомендована ціна: ₴4,200/ніч, +12% до baseline"), а людина — одним кліком підтверджує або коригує
- Notification = не "подивись і вирішуй", а "система вже зробила X, перевір якщо хочеш"

### P3. Одне джерело правди

Кожен факт існує в одному місці. Bookings — у `bookings` table. Guest profile — у `guests` table. Якщо дані дублюються (KeyCRM + нова система + Excel) — це тимчасовий стан міграції, не архітектура.

**Правило:** якщо хтось запитує "де подивитись X?" — відповідь завжди одна URL. Не "подивись у CRM, а якщо там нема — у Sheets, а якщо старі дані — у KeyCRM".

### P4. Мінімум полів, максимум сенсу

Кожне поле у формі — це когнітивне навантаження на менеджера і ще один source of error. Якщо поле не впливає на рішення або автоматизацію — його не має бути.

**Правило -40%:** порівняно з Odoo prototype, нова схема має на 40% менше полів. Для кожного поля є відповідь на: "Хто це читатиме і яке рішення прийме на основі цих даних?"

**Приклади:**
- ❌ `guest.color` (Odoo default) — ніхто не використовує
- ❌ `guest.lang` (зараз) — всі гості UA, i18n через 2+ роки
- ✅ `guest.source` — впливає на маркетинг-аналітику
- ✅ `booking.channelQuotaId` — впливає на revenue management

### P5. Готове рішення > власна розробка

Не вигадуй велосипед. Перед кожною фічею:

| Питання | Якщо "так" |
|---|---|
| Чи є OSS бібліотека яка робить 80%+ того що треба? | Використай (copy-paste > npm install > fork) |
| Чи є SaaS який робить це за прийнятну ціну? | Оціни TCO vs build-hours (€50 SaaS × 12 міс vs 80 годин build) |
| Чи є starter/template з якого можна скопіювати UI? | Скопіюй і адаптуй |
| Ні, нічого нема? | Тоді build, але мінімально — MVP логіка, не enterprise |

**Copy-paste ієрархія:**
1. **shadcn `npx add`** — один command, компонент у твоєму коді
2. **Copy з starter template** — Kiranism, Shadboard, file-by-file
3. **npm install** — бібліотека як dependency
4. **Fork repo** — тільки якщо треба deep modification (уникай)
5. **Build from scratch** — останній варіант

### P6. Покращуй логіку, не ускладнюй інтерфейс

Коли бізнес-процес неефективний — правильне рішення зазвичай не "додати ще одну кнопку", а переосмислити процес.

**Приклади:**
- Менеджери забувають follow-up → ❌ додати reminder popup → ✅ автоматичний follow-up email через 3 дні після proposal (BullMQ cron)
- Директор не бачить проблемних менеджерів → ❌ складний dashboard з 20 графіками → ✅ один variance alert: "Менеджер X: conversion -15% до плану, потрібна увага"
- Гість не оплачує → ❌ менеджер дзвонить вручну → ✅ автоматичний WhatsApp через 24 години з payment link

**Тест простоти UI:** чи зможе новий менеджер (перший робочий день) зрозуміти екран без інструктажу за 30 секунд? Якщо ні — екран надто складний.

### P7. Profit-first

Кожна фіча має відповідь на: "Як це впливає на revenue або витрати?" Якщо відповідь "ніяк, але зручно" — фіча йде в backlog, не в sprint.

**Фреймворк пріоритезації:**
1. **Гроші зараз:** фічі що збільшують конверсію або середній чек (payment links, follow-up automation, proposal templates)
2. **Гроші потім:** фічі що зменшують operational cost (auto-grading calls, housekeeping PWA, self-service portal)
3. **Захист грошей:** фічі що запобігають втратам (overbooking prevention, variance alerts, quota enforcement)
4. **Nice-to-have:** все інше

### P8. Role-based reality

Один і той самий об'єкт (Booking) виглядає по-різному для різних ролей:
- **Closer** бачить: guest name, dates, amount, stage → "як закрити цю угоду?"
- **Director** бачить: manager performance, channel, variance to plan → "хто працює добре?"  
- **Housekeeper** бачить: room number, check-out date, cleaning status → "що прибрати зараз?"
- **Revenue Manager** бачить: ADR, occupancy, channel mix → "як оптимізувати yield?"

Не "один дашборд для всіх", а чотири цілеспрямовані views з одних даних.

---

## Частина 2: Принципи розробки

### D1. Boring tech переможе

Обирай технологію яка існує 3+ роки, має 10k+ GitHub stars, і активну спільноту. "Hot new framework 2026" — це ризик, не перевага.

**Наш стек обраний за Lindy принципом:**
- PostgreSQL (30+ років)
- Node.js (15+ років)
- React (10+ років)
- Next.js (8+ років)
- Redis (15+ років)
- Prisma (5+ років)
- shadcn/ui (3+ роки)

Виняток допускається тільки коли нове рішення дає **≥2x перевагу** над boring альтернативою (наприклад Better-Auth vs custom auth — 10x швидше).

### D2. Claude Code — головний розробник, Сергій — product owner + reviewer

Claude Code пише 90%+ коду. Сергій:
- формулює requirements (що, не як)
- review-ає PR-и (читає код, не пише)
- приймає product decisions
- тестує UX вручну

**Наслідки для архітектури:**
- TypeScript strict mode обов'язковий — це safety net для AI-generated коду
- Простіші абстракції > розумніші: Claude Code краще генерує прямолінійний код ніж навороченіший (менше галюцинацій)
- CLAUDE.md = source of truth для Claude Code (conventions, schemas, business rules). Якщо це не в CLAUDE.md — Claude Code не знає.
- Кожне нетривіальне рішення документується в ADR (Architecture Decision Record) — Claude Code читає ADR щоб не переприймати рішення

### D3. Один промпт = один результат

Claude Code сесія повинна мати чітке deliverable: "після цієї сесії у нас буде працюючий kanban pipeline з drag-drop і persistent state". Не "попрацюй над CRM".

**Структура промпту:**
1. Context: що вже є, які файли дивитись
2. Task: конкретний list кроків
3. Verify: як перевірити що все працює
4. Commit: conventional commit message

### D4. Спрощуй безжалісно

Перед додаванням будь-чого:

```
Чи можна НЕ робити це? → якщо так → не роби
Чи можна зробити простіше? → якщо так → зроби простіше
Чи можна зробити пізніше? → якщо так → backlog
```

**Конкретно:**
- Не додавай поле "на всяк випадок" — додаш коли знадобиться (Prisma migration = 2 хвилини)
- Не створюй абстракцію поки не маєш 3+ конкретних use cases
- Не пиши generic компонент — пиши конкретний, потім generalize якщо повториться тричі
- Не оптимізуй performance поки нема проблеми (170 номерів ≠ 170,000)

**Rule of Three:** перший раз — write inline. Другий раз — copy-paste, note duplication. Третій раз — extract shared function/component.

### D5. Тестуй критичне, не все

100% test coverage — театр якості для solo+AI. Тестуй тільки те, де помилка коштує грошей:

| Тестувати обов'язково | Не тестувати |
|---|---|
| Payment webhook signature verification | UI component rendering |
| Pipeline stage transition rules | Button color |
| CASL permission checks (Closer ≠ Director) | Form label text |
| Booking date validation (overlap, overbooking) | Sidebar toggle |
| Cron job: variance calculation | Toast appearance |

**Мінімальний test suite:**
- Vitest: бізнес-логіка (stage transitions, price calculations, CASL abilities)
- Playwright: 3-5 critical paths (login → create booking → generate payment link → pay → confirmed)
- Zod: contract validation на всіх tRPC inputs (це не тест, це type safety — безкоштовно)

### D6. Ship daily, improve weekly

**Daily (поки MVP):**
- Одна Claude Code сесія = один feature chunk
- Commit + push наприкінці сесії
- Deploy автоматично (Coolify auto-deploy on push to main)

**Weekly (після запуску):**
- Monday: review Sentry errors + failed BullMQ jobs
- Tuesday-Thursday: feature development
- Friday: deploy, update CHANGELOG.md, plan next week

**Не бій-ся deploy-ити "неготове":**
- Порожня сторінка /planning краще ніж відсутність маршруту
- Feature flag: `if (process.env.FEATURE_PLANNING === 'true')` — дешево, просто

### D7. Database = правда, UI = проєкція

Prisma schema — це **canonical definition** бізнес-домену. UI — лише read/write view на цю схему. Якщо виникає конфлікт між "красивим UI" і "правильною data model" — data model виграє завжди.

**Наслідки:**
- Спочатку проектуємо schema, потім UI
- Кожна зміна у бізнес-процесі починається з migration, не з компонента
- Materialized views для dashboards — SQL правда, Tremor лише малює

### D8. Escape hatch для кожного рішення

Жодне технічне рішення не повинне бути безвихідним. Для кожного — documented шлях міграції:

- Better-Auth → Auth.js: ~1 тиждень
- Prisma → Drizzle: ~2 тижні  
- tRPC → Hono REST: ~2 тижні
- Coolify → Dokploy: ~3 дні
- BullMQ → Trigger.dev: ~2 тижні
- Resend → AWS SES: ~1 день

**Як забезпечити escape hatch:**
- Business logic у `/server/services/` — framework-agnostic функції
- Zod schemas для всіх зовнішніх контрактів (webhooks, API responses)
- Avoid vendor-specific imports у business logic (не `import { auth } from 'better-auth'` у service layer — тільки у auth.ts wrapper)

### D9. Documentation = CLAUDE.md + ADRs + inline коментарі

Три рівні документації:

| Що | Де | Для кого |
|---|---|---|
| Стек, conventions, project structure | **CLAUDE.md** (корінь репо) | Claude Code (читає перед кожною сесією) |
| Чому обрали X а не Y | **ADR-NN** файли у `/docs/adr/` | Сергій (при ревізії) + майбутній розробник |
| Як працює конкретна функція | **Inline коментарі** у коді | Claude Code (при модифікації) |

Не пиши окрему wiki/docs site — це overhead. CLAUDE.md = живий документ, оновлюється при кожному значному рішенні.

### D10. Pareto у всьому

80% value за 20% effort — не просто слоган, а метод прийняття рішень:

- **80% фічі працює → ship.** Останні 20% edge cases додаси коли хтось поскаржиться.
- **80% красиво → достатньо.** Pixel-perfect polish — Phase 3, не Phase 1.
- **80% тестів покривають 20% коду** (critical paths) — і це правильно.
- **80% автоматизації покриває 20% процесів** (найчастіших) — і це дає найбільший ROI.

---

## Частина 3: Operational checklist (перед кожним рішенням)

Перед додаванням нового модуля, фічі, або залежності — пройди цей checklist:

```
□ Чи це потрібно для Revenue або Cost reduction? (P7)
□ Чи можна видалити цей процес повністю? (P1)
□ Чи можна автоматизувати без UI? (P1, P2)
□ Чи є готове рішення? (P5)
□ Чи це boring tech? (D1)
□ Чи Claude Code зможе підтримувати це? (D2)
□ Чи є escape hatch? (D8)
□ Чи нова людина зрозуміє це за 30 секунд? (P6)
□ Чи є тест для critical path? (D5)
□ Чи оновлений CLAUDE.md? (D9)
```

Якщо 3+ відповіді "ні" — не додавай. Переосмисли.

---

*Цей документ — частина CLAUDE.md. Claude Code читає його перед кожною сесією.*
