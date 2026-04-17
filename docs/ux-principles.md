# UX & Dev Principles — Ruta OS

## UX Principles (P1-P20)

### Core UX
- **P1** — Right Person, Right Screen, Right Time (role-based reality)
- **P2** — Zero Cognitive Load для новачка (шлях завжди очевидний)
- **P3** — Above the Fold = вся інформація для прийняття рішення
- **P4** — Sequential CTA (послідовні, не паралельні дії)
- **P5** — Zero Friction для гостя (мінімум кроків на guest-facing сторінках)
- **P6** — Автологування > ручне введення (auto-create Inquiry з Ringostat)
- **P7** — Незворотні дії = підтвердження + показ наслідків перед виконанням
- **P8** — Feedback на кожну дію ≤300ms (toast + skeleton)
- **P9** — Мобільний менеджер = спрощений режим (critical path в 2 tap)
- **P10** — Помилка = підказка, не покарання (inline hint, не red modal)
- **P11** — Source-first navigation (меню відбиває звідки запит: chat → call → direct)
- **P12** — One entity, many states (Замовлення = єдина сутність зі стадіями)
- **P13** — Defer everything non-core (AI, real-time, mobile — не MVP)
- **P14** — Foundations > Features (правильна модель > багато функцій)
- **P15** — Always Next Action (кожна активна картка має одну обов'язкову дію)
- **P16** — Save Requires Complete Data (blockers > warnings, форма не зберігається без обов'язкових полів)
- **P17** — Mandatory Wrap-up (обов'язкова форма після кожного дзвінка або закриття задачі)
- **P18** — Focus Mode Default (видно тільки сьогоднішню чергу, не весь pipeline)
- **P19** — End-of-Day Zero Mission (0 unprocessed + 0 без next action + 0 overdue = ціль дня)
- **P20** — Audit Everything (кожна зміна через AuditLog: userId, action, before/after)

**Conflict rules:** P7 > P4 | P2 > P15 | P5 > everything on guest-facing pages

---

## Dev Principles (D1-D26)

### Architecture
- **D1** — Server Components за замовчуванням. `"use client"` тільки для useState/useEffect/event handlers
- **D2** — Server Actions замість API routes. API routes тільки для webhooks і tokenized public endpoints
- **D3** — Prisma `$transaction` для multi-step ops. Все або нічого
- **D4** — Zod validation на вході кожного server action: `input → Zod.parse() → throws on invalid`
- **D5** — Error boundaries на route level (`error.tsx` на кожному route)

### UX Patterns
- **D6** — Toast на кожну мутацію: success → green "Збережено ✓" 2s, error → red + [Retry]
- **D7** — Skeleton завжди, Spinner рідко. Spinner всередину кнопки, не overlay. UI блокується <400ms
- **D8** — Optimistic UI тільки для безпечних дій (toggle, assign). Payment/proposal — wait
- **D9** — Form = react-hook-form + zod + Shadcn Form. Validate client + re-validate server
- **D10** — Дати через date-fns, `format(date, 'dd.MM.yyyy')`, uk locale
- **D11** — URL state через nuqs: фільтри, вкладки, пагінація — shareable, bookmark-able
- **D12** — TanStack Query для server state: useQuery fetch, useMutation write, automatic refetch

### Feature Pragmatism
- **D13** — Один шлях, не багато. При двох способах → видаляємо один
- **D14** — Empty states корисні: "Нічого немає + CTA що робити далі"
- **D15** — Undo через soft-delete. Психологічна безпека менеджера
- **D16** — Всі UI-тексти в `lib/i18n/uk.ts` (єдине джерело)

### Performance
- **D17** — LCP < 2.5s, INP < 200ms, CLS < 0.1
- **D18** — Images через next/image (width/height + priority для LCP + WebP)
- **D19** — Індекси на всі WHERE поля: status, assignedTo, propertyId, stage, checkIn

### Deploy / Reliability
- **D20** — Feature flags у .env: нова фіча за `FEATURE_X=true`, deploy без exposing
- **D21** — Webhook idempotency: перевірка externalId перед обробкою (WayForPay, Telegram, Ringostat)
- **D22** — Staging mirrors production (sandbox webhooks активні)
- **D23** — Monitoring з дня 1: Sentry + Axiom + uptime check

### Ship-first
- **D24** — 80/20 на фічу: якщо 80% кейсів OK → shipping. 20% edge cases → пізніше
- **D25** — 24-год turnaround: deploy → real user → feedback → iteration
- **D26** — Вчасно відмовлятись: якщо складніше ніж планували → викидаємо половину → ship мінімум

---

## Product Principles (P1-P10 strategic)

- **P1** — Eliminate → Automate → Assign to human (in that order)
- **P2** — System does, humans decide
- **P3** — One source of truth (no duplicated facts)
- **P4** — -40% fields vs Odoo (every field: "who reads this and what decision does it enable?")
- **P5** — Ready solution > custom build (shadcn npx > copy template > npm > build)
- **P6** — Improve logic, don't complicate UI (30-second test for new manager)
- **P7** — Profit-first (every feature: "how does this affect revenue?")
- **P8** — Role-based reality (4 different views, not one dashboard for all)
- **D9** — Documentation = CLAUDE.md + ADRs + inline comments
- **D10** — Pareto everywhere (80% value at 20% effort → ship)

---

## Component Inventory

### Build (custom, critical)
- `OrderCard` — 5 tabs + context panel (main system component)
- `ChargesTable` — Взаєморозрахунки з типами нарахувань
- `PaymentScheduleList` — Payment schedule + statuses
- `NextActionBanner` — Always-visible in every card
- `WrapUpForm` — Mandatory after call/unqualify/lost
- `ProposalPage` — Guest-facing `/portal/booking/[token]` (mobile-first)
- `SensitiveField` — Masked display for documents
- `EODProgress` — "Завершення дня" widget

### From shadcn (copy/npx)
`Sheet`, `Command` (⌘K), `Tabs`, `Dialog`, `Skeleton`, `Toast/Sonner`, `Badge`, `Calendar`, `Combobox`
