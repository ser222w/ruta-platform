# CHAT C — Omnichannel Inbox (WhatsApp + Telegram)
# Запускати ПАРАЛЕЛЬНО з Chat B і Chat D після завершення Chat A
# Вставити цілком у новий чат Claude Code в директорії ruta-platform/

---

## Режим роботи (ОБОВ'ЯЗКОВО)

### Фаза 1 — Дослідження + План (AUTO-EXECUTE)
1. Читай CLAUDE.md, channels.prisma, src/server/hono/app.ts — автоматично
2. Перевір що вже є: Conversation/Message models, існуючий inbox UI
3. Склади ПЛАН: файли, кроки, ризики (особливо для webhook verify flow)
4. **СТОП → Покажи план → Чекай апруву**

### Фаза 2 — Виконання (після апруву, автономно)

### Фаза 3 — Тестування (після кожного блоку)
```bash
bun run typecheck && bun run lint

# WhatsApp verify:
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test&hub.challenge=abc123"
# Очікуй: abc123

# Simulated inbound message:
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"id":"test-msg-001","from":"380671234567","type":"text","text":{"body":"Привіт, є вільні номери?"},"timestamp":"1234567890"}],"contacts":[{"wa_id":"380671234567","profile":{"name":"Test Guest"}}],"metadata":{"phone_number_id":"test"}}}],"id":"test"}]}' 

bun run test:e2e
```

**E2E тести (`tests/e2e/inbox.spec.ts`):**
```typescript
// Тест 1: Inbound WhatsApp повідомлення з'являється в inbox
test('whatsapp inbound creates conversation', async ({ page, request }) => {
  await loginAsCloser(page)
  await page.goto('/inbox')
  // Send webhook
  await request.post('/api/webhooks/whatsapp', { data: mockWhatsAppPayload })
  // Expect conversation in list
  await page.reload()
  await expect(page.locator('text=Test Guest')).toBeVisible()
})

// Тест 2: Менеджер відповідає через inbox
test('manager sends reply message', async ({ page }) => {
  // Open conversation
  // Type reply
  await page.fill('[data-testid=message-composer]', 'Так, є вільні номери!')
  await page.keyboard.press('Enter')
  // Verify message appears in thread as OUTBOUND
  await expect(page.locator('text=Так, є вільні номери!')).toBeVisible()
  // Verify Message record in DB (via tRPC)
})

// Тест 3: Conversation auto-links to existing guest
test('conversation links to existing guest by phone', async ({ page }) => {
  // Guest with +380671234567 already exists
  // Send whatsapp from that number
  // Verify conversation shows guest name + LTV
})
```

---

## Контекст сесії

Ти Senior Full-Stack TypeScript Developer, будуєш RUTA OS.

**Прочитай перед початком:**
1. `CLAUDE.md` — стек, конвенції, бізнес-правила
2. `CHANGELOG.md` — що вже зроблено
3. `prisma/schema/channels.prisma` — Conversation, Message моделі (вже існують)
4. `src/server/hono/app.ts` — як підключені webhooks

**Поточний стан:** Chat A виконано. Conversation/Message schema є. Ця сесія додає реальні webhook integrations + Inbox UI.

---

## Ціль сесії

**Менеджер бачить всі звернення (WhatsApp + Telegram) в одному вікні. Відповідає з платформи. Гість отримує в свій месенджер.**

---

## Scope

### 1. WhatsApp Cloud API webhook (`src/server/hono/webhooks/whatsapp.ts`)

**Verify webhook (GET):**
```typescript
// Meta надсилає GET для верифікації при налаштуванні
app.get('/api/webhooks/whatsapp', (c) => {
  const mode = c.req.query('hub.mode')
  const token = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return c.text(challenge)
  }
  return c.text('Forbidden', 403)
})
```

**Receive message (POST):**
```typescript
// Payload від Meta WhatsApp Cloud API
interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account'
  entry: [{
    id: string
    changes: [{
      value: {
        messaging_product: 'whatsapp'
        metadata: { phone_number_id: string }
        contacts: [{ wa_id: string, profile: { name: string } }]
        messages?: [{
          id: string          // message ID (для idempotency)
          from: string        // sender phone (wa_id)
          timestamp: string
          type: 'text' | 'image' | 'audio' | 'document'
          text?: { body: string }
          image?: { id: string, mime_type: string }
        }]
      }
      field: 'messages'
    }]
  }]
}
```

**Логіка обробки:**
```
1. Verify X-Hub-Signature-256 header (sha256 hmac)
2. For each message:
   a. Idempotency: Message WHERE externalId=message.id → skip if exists
   b. Normalize phone: waId → +380XXXXXXXXX
   c. Find or create GuestProfile by phone
   d. Find or create Conversation { channel: WHATSAPP, guestId, status: OPEN }
   e. Create Message { direction: INBOUND, content, externalId, channel: WHATSAPP }
   f. Update Conversation.lastMessageAt
   g. If new conversation → create Inquiry (source: WHATSAPP, status: NEW)
   h. Push SSE event: { type: 'NEW_MESSAGE', conversationId }
3. Return 200 OK immediately (Meta retry if non-200)
```

### 2. WhatsApp send service (`src/server/services/whatsapp.ts`)

```typescript
export async function sendWhatsAppMessage(
  toPhone: string,
  content: string
): Promise<{ messageId: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone.replace('+', ''),
        type: 'text',
        text: { body: content },
      }),
    }
  )
  const data = await response.json()
  return { messageId: data.messages[0].id }
}

export async function sendWhatsAppPaymentLink(
  toPhone: string,
  guestName: string,
  bookingDetails: string,
  portalUrl: string
): Promise<void> {
  const message = `Вітаємо, ${guestName}! 🏨\n\nВаше бронювання:\n${bookingDetails}\n\nПосилання для оплати:\n${portalUrl}\n\nДійсне 72 години.`
  await sendWhatsAppMessage(toPhone, message)
}
```

### 3. Telegram bot webhook (`src/server/hono/webhooks/telegram.ts`)

Використовуємо `grammy` (lightweight, TypeScript-first):
```bash
bun add grammy
```

**Webhook mode (не polling!):**
```typescript
import { Bot, webhookCallback } from 'grammy'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

bot.on('message', async (ctx) => {
  const msg = ctx.message
  const telegramId = String(msg.from.id)
  const text = msg.text || '[media]'
  
  // Find/create guest by telegramId
  // Find/create Conversation { channel: TELEGRAM }
  // Create Message { direction: INBOUND }
  // Push SSE event
  
  // Don't reply here — reply comes from Inbox UI
})

// Mount as Hono handler:
app.post('/api/webhooks/telegram', webhookCallback(bot, 'hono'))
```

**Telegram send service** (`src/server/services/telegram.ts`):
```typescript
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<void> {
  await bot.api.sendMessage(chatId, text)
}
```

### 4. tRPC router для Inbox (`src/server/trpc/routers/inbox.ts`)

```typescript
export const inboxRouter = createTRPCRouter({
  // Список розмов з пагінацією
  listConversations: authedProcedure
    .input(z.object({
      status: z.enum(['OPEN', 'RESOLVED', 'ALL']).default('OPEN'),
      channel: z.enum(['WHATSAPP', 'TELEGRAM', 'ALL']).default('ALL'),
      assignedToMe: z.boolean().default(false),
      cursor: z.string().optional(),
      limit: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Повідомлення в розмові
  getMessages: authedProcedure
    .input(z.object({
      conversationId: z.string(),
      cursor: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Відправка повідомлення
  sendMessage: authedProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(4000),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get conversation + guest phone/telegramId
      // 2. Send via whatsapp.ts or telegram.ts
      // 3. Create Message { direction: OUTBOUND, sentById: ctx.user.id }
      // 4. Update conversation.lastMessageAt
    }),

  // Assign to manager
  assignConversation: authedProcedure
    .input(z.object({ conversationId: z.string(), managerId: z.string() }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Mark resolved
  resolveConversation: authedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => { ... }),
})
```

### 5. Inbox UI (`src/app/(dashboard)/inbox/`)

**Three-column layout** (з wireframe в docs/RUTA_CRM_v2_5_WIREFRAMES.md):

```
src/app/(dashboard)/inbox/
├── page.tsx                    # Server component, layout
├── layout.tsx                  # (if needed)
└── [conversationId]/page.tsx   # Deep link to specific conversation

src/components/inbox/
├── conversation-list.tsx       # Ліва колонка: список розмов
├── conversation-item.tsx       # Один рядок в списку
├── message-thread.tsx          # Центр: повідомлення
├── message-bubble.tsx          # Одне повідомлення (inbound/outbound)
├── message-composer.tsx        # Поле відповіді + кнопка Send
└── conversation-context.tsx    # Права колонка: гість + пов'язані замовлення
```

**Conversation list item:**
```
[Avatar] Mariia G.  · 💬 Telegram  · 5хв
         "Шукаємо родинний номер..."
         [🔴 NEW] [Непризначено]
```

**Message thread:**
- Повідомлення гостя: ліво, сіре
- Повідомлення менеджера: право, синє
- Timestamp під кожним
- Auto-scroll до останнього

**Composer:**
- Textarea (Shift+Enter для нового рядка, Enter відправляє)
- Кнопка "Надіслати посилання на оплату" (якщо є пов'язане замовлення з готовим portal token)

**Real-time:** useAppEvents() hook → при NEW_MESSAGE event для цього conversationId → refetch messages (TanStack Query invalidate)

**Фільтри в списку:**
- [Нові] [Мої] [Всі] — таби
- [💬 Telegram] [📱 WhatsApp] — channel filter (nuqs)

### 6. Conversation context panel (права колонка)

```
┌─────────────────────────┐
│ 👤 Mariia Goncharenko   │
│ +380671234567           │
│ Segment: FRIEND         │
│ 2 заїзди · LTV ₴28,000  │
│                         │
│ Пов'язані замовлення:   │
│ #1234 · 12-15 травня    │
│ AWAITING_PAY            │
│ [Відкрити →]            │
│                         │
│ [+ Створити замовлення] │
└─────────────────────────┘
```

### 7. ENV variables

```bash
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_VERIFY_TOKEN="random-string-you-choose"
TELEGRAM_BOT_TOKEN=""
```

---

## НЕ робити в цій сесії

- ❌ Instagram DM integration (Phase 3)
- ❌ Email inbound (Phase 3)
- ❌ AI message drafts (Phase 5)
- ❌ File/image sending (placeholder ok)
- ❌ Read receipts

---

## Verification

```bash
# WhatsApp verify:
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Expect: test123

# Telegram set webhook (після деплою):
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://app.ruta.cam/api/webhooks/telegram"

bun run typecheck && bun run test
```

Перевір вручну:
1. `/inbox` відкривається з порожнім станом або тестовими даними
2. Три колонки відображаються правильно
3. Кнопка "Відповісти" відправляє повідомлення (перевір в Prisma Studio)

---

---

## Тестування + Auto-Healing (після кожного блоку)

```
КОД → typecheck → lint → curl webhook → unit tests → e2e → commit
    ↑___________fix (max 3 спроби)_________________________↑
```

**Auto-healing:**
- WhatsApp webhook 403 → перевір signature verification (X-Hub-Signature-256)
- Telegram webhook не реєструється → перевір `setWebhook` URL доступний ззовні (ngrok для local)
- Message не з'являється в thread → перевір SSE або refetch на NEW_MESSAGE event
- E2E `fill composer` fails → перевір data-testid атрибут на textarea
- grammy import error → перевір `bun add grammy` виконано
- Після 3 спроб → зупинись, опиши

---

## Документування + Деплой (в кінці, AUTO-EXECUTE)

### 1. Оновити CLAUDE.md — CURRENT STATUS
`✅ Chat C: Omnichannel Inbox — [дата]`

### 2. Оновити CHANGELOG.md
```markdown
## [0.9.0] — YYYY-MM-DD — Chat C: Omnichannel Inbox

### Added
- WhatsApp Cloud API: inbound webhook + signature verification
- WhatsApp outbound: sendMessage, sendPaymentLink helpers
- Telegram bot (grammy): inbound webhook mode
- Telegram outbound: sendMessage helper
- Inbox UI: 3-column layout (list + thread + context)
- ConversationList, MessageThread, MessageComposer, ConversationContext components
- Real-time updates via SSE (NEW_MESSAGE event)
- Guest auto-link by phone number
- tRPC inbox router: listConversations, getMessages, sendMessage, assignConversation, resolveConversation

### Technical
- New Hono webhooks: /api/webhooks/whatsapp, /api/webhooks/telegram
- New: src/server/services/whatsapp.ts, telegram.ts
- bun add grammy
- E2E tests: tests/e2e/inbox.spec.ts
```

### 3. Фінальна перевірка
```bash
bun run typecheck && bun run lint && bun run test && bun run build
```

### 4. Commit + Push
```bash
git add -A && git status
git commit -m "feat: omnichannel inbox — whatsapp + telegram webhooks + inbox UI"
git push origin main
```

### 5. Smoke-test prod
- WhatsApp verify: curl GET до /api/webhooks/whatsapp з hub params
- Telegram: setWebhook → надіслати повідомлення боту → перевір в /inbox
- Відповісти з платформи → перевір що Telegram отримав

### 6. Фінальний звіт
```
✅ Chat C: Omnichannel Inbox завершено
Тести: unit [N/N] ✅  e2e [N/N] ✅
Deploy: app.ruta.cam ✅
```
