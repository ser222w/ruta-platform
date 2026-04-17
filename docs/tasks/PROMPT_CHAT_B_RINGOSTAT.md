# CHAT B — Ringostat: Auto-Inquiry від дзвінка
# Запускати ПІСЛЯ того як Chat A завершено і змерджено в main
# Вставити цілком у новий чат Claude Code в директорії ruta-platform/
# ФІНАЛЬНА ФАЗА: виконай docs/ops.md "Chat Completion Checklist" (typecheck→lint→test→e2e→docs→commit→push→deploy verify)

---

## Режим роботи (ОБОВ'ЯЗКОВО)

### Фаза 1 — Дослідження + План (AUTO-EXECUTE)
1. Читай CLAUDE.md, src/server/hono/app.ts, існуючі routers — автоматично
2. Перевір що вже є в schema (PhoneCall model?)
3. Склади ПЛАН: файли, кроки, ризики
4. **СТОП → Покажи план → Чекай апруву**

### Фаза 2 — Виконання (після апруву, автономно до кінця)

### Фаза 3 — Тестування (після кожного блоку)
```bash
bun run typecheck && bun run lint

# Webhook тест:
curl -X POST http://localhost:3000/api/webhooks/ringostat \
  -H "Content-Type: application/json" \
  -H "X-Ringostat-Secret: test-secret" \
  -d '{"event":"call_start","call_id":"e2e-test-001","caller_number":"+380671234567","direction":"incoming"}'
# Очікуй: 200 OK

# Перевір в Prisma Studio: PhoneCall + Inquiry створені

bun run test:e2e  # запусти e2e тести
```

**E2E тести (`tests/e2e/ringostat.spec.ts`):**
```typescript
// Тест 1: Webhook обробляється, Inquiry створюється
test('ringostat call_start creates inquiry', async ({ request }) => {
  const response = await request.post('/api/webhooks/ringostat', {
    headers: { 'X-Ringostat-Secret': process.env.RINGOSTAT_WEBHOOK_SECRET! },
    data: { event: 'call_start', call_id: 'test-e2e-123', caller_number: '+380671111111', direction: 'incoming' }
  })
  expect(response.status()).toBe(200)
  // Verify Inquiry exists in DB via tRPC
})

// Тест 2: Screen pop з'являється в браузері менеджера
test('manager sees incoming call popup', async ({ page }) => {
  await loginAsCloser(page)
  await page.goto('/today')
  // Trigger webhook via API
  // Expect popup to appear within 2s
  await expect(page.locator('[data-testid=incoming-call-popup]')).toBeVisible({ timeout: 3000 })
})

// Тест 3: Дублікат call_id ігнорується (idempotency)
test('duplicate call_id is idempotent', async ({ request }) => {
  // Send same call_id twice
  // Verify only 1 PhoneCall in DB
})
```

---

## Контекст сесії

Ти Senior Full-Stack TypeScript Developer, будуєш RUTA OS.

**Прочитай перед початком:**
1. `CLAUDE.md` — стек, конвенції, бізнес-правила
2. `CHANGELOG.md` — що вже зроблено (включно з Chat A результатами)
3. `src/server/hono/app.ts` — як підключені webhooks
4. `src/server/trpc/routers/inquiry.ts` — існуючий Inquiry router (з Chat A)

**Поточний стан:** Chat A виконано — є Inquiry model, tRPC router, UI. Ця сесія додає автоматичне створення Inquiry з вхідного дзвінка Ringostat.

---

## Ціль сесії

**Менеджер піднімає трубку → система вже знає хто дзвонить → Inquiry auto-створено → картка відкрита → 3 кліки до payment link.**

---

## Scope

### 1. Ringostat webhook handler (`src/server/hono/webhooks/ringostat.ts`)

Ringostat надсилає POST при кожній події дзвінка.

**Events що обробляємо:**
- `call_start` (incoming) — основний тригер
- `call_end` — оновити тривалість + запис
- `missed_call` — створити Inquiry зі статусом MISSED

**Payload від Ringostat:**
```typescript
interface RingostatWebhookPayload {
  event: 'call_start' | 'call_end' | 'missed_call'
  call_id: string           // унікальний ID дзвінка
  caller_number: string     // номер телефону гостя
  called_number: string     // номер менеджера / внутрішній
  direction: 'incoming' | 'outgoing'
  duration?: number         // секунди (тільки call_end)
  record_url?: string       // URL запису (тільки call_end)
  manager_email?: string    // email менеджера якщо є в Ringostat
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}
```

**Логіка `call_start` incoming:**
```
1. Verify webhook secret (header X-Ringostat-Secret === RINGOSTAT_WEBHOOK_SECRET)
2. Idempotency check: if PhoneCall exists with externalId=call_id → skip
3. Normalize phone: +380XXXXXXXXX format
4. Find guest: GuestProfile WHERE phone=callerNumber OR phone2=callerNumber
5. Find manager: User WHERE email=managerEmail OR assignedPhone=calledNumber
6. Create PhoneCall record (status=ACTIVE, externalId=call_id)
7. Create Inquiry (source=PHONE, status=NEW, guestId if found, assignedTo=manager)
8. Push SSE event to manager's browser: { type: 'INCOMING_CALL', payload: {...} }
9. Return 200 OK
```

**Логіка `call_end`:**
```
1. Find PhoneCall by externalId=call_id
2. Update: status=COMPLETED, duration, recordUrl
3. Update linked Inquiry: if duration > 0 → status=IN_PROGRESS, else status=MISSED
4. Push SSE event: { type: 'CALL_ENDED', callId, duration }
```

### 2. SSE endpoint для real-time нотифікацій (`src/app/api/events/route.ts`)

```typescript
// Server-Sent Events endpoint
// GET /api/events?userId=xxx
// Клієнт підключається при login, тримає з'єднання
// Сервер пушить події через global event emitter

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response('Unauthorized', { status: 401 })
  
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe userId to global emitter
      // On event: controller.enqueue(...)
      // On disconnect: cleanup
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

**Global event emitter** (`src/server/events.ts`):
```typescript
import { EventEmitter } from 'events'
// Singleton, shared across requests in same process
export const appEvents = new EventEmitter()
export function pushToUser(userId: string, event: AppEvent) { ... }
```

### 3. Screen pop component (`src/components/shared/incoming-call-popup.tsx`)

UI що з'являється у менеджера при вхідному дзвінку:

```
┌─────────────────────────────────┐
│ 📞 Вхідний дзвінок              │
│                                 │
│ Olena Kovalenko                 │
│ +38067XXXXXXX                   │
│ 3 заїзди · LTV ₴42,000         │
│ Остання: Поляна, лют 2026       │
│                                 │
│ [Відкрити картку]  [Відхилити]  │
└─────────────────────────────────┘
```

- З'являється як fixed overlay (top-right)
- Auto-dismiss після 30 сек якщо не натиснуто
- "Відкрити картку" → redirect до `/inquiries/[id]`
- Якщо гість невідомий → "Новий гість" замість імені

### 4. Hook для SSE (`src/lib/hooks/use-app-events.ts`)

```typescript
export function useAppEvents() {
  useEffect(() => {
    const eventSource = new EventSource('/api/events')
    eventSource.onmessage = (e) => {
      const event = JSON.parse(e.data)
      if (event.type === 'INCOMING_CALL') {
        // Show IncomingCallPopup via Zustand store
      }
    }
    return () => eventSource.close()
  }, [])
}
```

Підключити в `src/app/(dashboard)/layout.tsx`.

### 5. Zustand store для UI state (`src/lib/stores/call-store.ts`)

```typescript
interface CallStore {
  activeCall: IncomingCallData | null
  setActiveCall: (call: IncomingCallData | null) => void
}
```

### 6. PhoneCall model (перевір чи є в schema)

Якщо `prisma/schema/calls.prisma` ще не має PhoneCall:
```prisma
model PhoneCall {
  id          String   @id @default(cuid())
  externalId  String   @unique  // Ringostat call_id
  callerPhone String
  direction   String   // incoming | outgoing
  status      String   // ACTIVE | COMPLETED | MISSED
  duration    Int?     // seconds
  recordUrl   String?
  inquiryId   String?
  inquiry     Inquiry? @relation(fields: [inquiryId], references: [id])
  managerId   String?
  manager     User?    @relation(fields: [managerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("phone_calls")
}
```

### 7. ENV variables (додати в `.env.example`)

```bash
RINGOSTAT_WEBHOOK_SECRET="your-secret-here"
RINGOSTAT_API_KEY=""
```

---

## НЕ робити в цій сесії

- ❌ STT transcription / AI grading (Phase 4)
- ❌ Outbound call integration
- ❌ Call recording playback UI
- ❌ CQR dashboard (Chat D)

---

## Verification

```bash
# Test webhook locally:
curl -X POST http://localhost:3000/api/webhooks/ringostat \
  -H "Content-Type: application/json" \
  -H "X-Ringostat-Secret: your-secret" \
  -d '{"event":"call_start","call_id":"test-123","caller_number":"+380671234567","direction":"incoming"}'

# Expect: 200 OK, new Inquiry in DB
bun run typecheck && bun run test
```

---

---

## Тестування + Auto-Healing (після кожного блоку)

```
КОД → typecheck → lint → unit tests → curl webhook test → e2e → commit
    ↑_____________fix (max 3 спроби)___________________________↑
```

**Auto-healing:**
- TypeScript error → fix тип, ніколи `as any`
- Webhook 400/500 → читай Hono error handler logs
- SSE не приходить → перевір EventEmitter singleton, userId matching
- E2E popup не з'являється → перевір useAppEvents підключено в layout.tsx
- Після 3 спроб без результату → зупинись, опиши проблему

---

## Документування + Деплой (в кінці, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md — CURRENT STATUS
`✅ Chat B: Ringostat + SSE — [дата]`

### 2. Оновити CHANGELOG.md
```markdown
## [0.8.0] — YYYY-MM-DD — Chat B: Ringostat + SSE

### Added
- Ringostat webhook: call_start → auto-Inquiry creation
- Ringostat webhook: call_end → update duration + record URL
- SSE endpoint /api/events for real-time manager notifications
- IncomingCallPopup component (fixed overlay, auto-dismiss 30s)
- Zustand call store for UI state
- useAppEvents hook (mounted in dashboard layout)

### Technical
- New Hono route: /api/webhooks/ringostat
- New API route: /api/events (SSE)
- New: src/server/events.ts (global EventEmitter)
- New: src/lib/stores/call-store.ts
- PhoneCall model migration (if added)
- E2E tests: tests/e2e/ringostat.spec.ts
```

### 3. Фінальна перевірка
```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

### 4. Commit + Push
```bash
git add -A && git status
git commit -m "feat: ringostat webhook — auto-inquiry + SSE screen pop"
git push origin main
```

### 5. Smoke-test prod
- Надіслати test curl до prod webhook URL
- Перевір Inquiry з'явилась в /inquiries
- Відкрий /today в браузері → надішли curl → перевір popup

### 6. Фінальний звіт
```
✅ Chat B: Ringostat + SSE завершено
Тести: unit [N/N] ✅  e2e [N/N] ✅  curl ✅
Deploy: app.ruta.cam ✅
```
