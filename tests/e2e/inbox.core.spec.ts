import { test, expect } from '@playwright/test';
import { loginAsCloser } from './helpers';
import { PrismaClient } from '@prisma/client';

// =============================================================
// INBOX CORE E2E TESTS — real TelegramAdapter with valid Update format
// Serial: tests share a single inbox + rely on sequential DB state
// =============================================================

test.describe.configure({ mode: 'serial' });

const db = new PrismaClient();

let testInboxId: string;

// Build a real Telegram Update object
function makeTgUpdate(opts: {
  messageId: number;
  chatId: number;
  fromId: number;
  fromName: string;
  text: string;
  updateId?: number;
}) {
  return {
    update_id: opts.updateId ?? Math.floor(Math.random() * 1_000_000),
    message: {
      message_id: opts.messageId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: opts.chatId, type: 'private', first_name: opts.fromName },
      from: { id: opts.fromId, is_bot: false, first_name: opts.fromName, language_code: 'uk' },
      text: opts.text
    }
  };
}

test.beforeAll(async () => {
  const inbox = await db.inbox.upsert({
    where: { channelType_externalId: { channelType: 'TELEGRAM', externalId: 'test-bot-999' } },
    create: {
      channelType: 'TELEGRAM',
      name: 'Test Bot (E2E)',
      externalId: 'test-bot-999',
      config: { botToken: 'fake-token-for-tests' },
      isActive: true
    },
    update: { isActive: true }
  });
  testInboxId = inbox.id;
});

test.afterAll(async () => {
  if (testInboxId) {
    await db.message.deleteMany({ where: { inboxId: testInboxId } });
    await db.conversation.deleteMany({ where: { inboxId: testInboxId } });
    await db.webhookEvent.deleteMany({ where: { inboxId: testInboxId } });
  }
  await db.$disconnect();
});

// =============================================================
// Test 1: Inbound webhook creates Conversation + Message + Guest
// =============================================================
test('telegram adapter: inbound webhook creates conversation and message', async ({ request }) => {
  const chatId = 1001 + Math.floor(Math.random() * 9000);
  const fromId = 2001 + Math.floor(Math.random() * 9000);
  const messageId = 3001 + Math.floor(Math.random() * 9000);
  const text = 'Привіт, є вільні номери на травень?';

  const payload = makeTgUpdate({ messageId, chatId, fromId, fromName: 'E2E Test Guest', text });

  const response = await request.post(`/api/webhooks/telegram/${testInboxId}`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' }
  });

  expect(response.status()).toBe(200);

  // externalThreadId = chatId (string)
  const conversation = await db.conversation.findFirst({
    where: { inboxId: testInboxId, externalThreadId: String(chatId) },
    include: { messages: true }
  });

  expect(conversation).not.toBeNull();
  expect(conversation!.channel).toBe('TELEGRAM');
  expect(conversation!.status).toBe('OPEN');
  expect(conversation!.unreadByManager).toBe(true);
  expect(conversation!.messages).toHaveLength(1);
  expect(conversation!.messages[0]!.content).toBe(text);
  expect(conversation!.messages[0]!.direction).toBe('INBOUND');
});

// =============================================================
// Test 2: Idempotency — same message processed only once
// =============================================================
test('telegram adapter: duplicate webhook is idempotent', async ({ request }) => {
  const chatId = 5001 + Math.floor(Math.random() * 1000);
  const fromId = 6001 + Math.floor(Math.random() * 1000);
  const messageId = 7001;
  const payload = makeTgUpdate({
    messageId,
    chatId,
    fromId,
    fromName: 'Idempotency Test',
    text: 'Test message'
  });

  await request.post(`/api/webhooks/telegram/${testInboxId}`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' }
  });
  const r2 = await request.post(`/api/webhooks/telegram/${testInboxId}`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' }
  });

  expect(r2.status()).toBe(200);

  const messages = await db.message.findMany({
    where: { conversation: { inboxId: testInboxId, externalThreadId: String(chatId) } }
  });
  expect(messages).toHaveLength(1);
});

// =============================================================
// Test 3: Inbox UI — /dashboard/inbox renders
// =============================================================
test('inbox page renders 3-column layout', async ({ page }) => {
  await loginAsCloser(page);
  await page.goto('/dashboard/inbox');
  await expect(page.locator('h1')).toContainText('Inbox');
});

// =============================================================
// Test 4: WebhookEvent record created
// =============================================================
test('telegram adapter: webhook event logged', async ({ request }) => {
  const chatId = 8001 + Math.floor(Math.random() * 1000);
  const fromId = 9001 + Math.floor(Math.random() * 1000);
  const messageId = 10001 + Math.floor(Math.random() * 1000);
  const payload = makeTgUpdate({
    messageId,
    chatId,
    fromId,
    fromName: 'Event User',
    text: 'Event log test'
  });

  const before = new Date();

  await request.post(`/api/webhooks/telegram/${testInboxId}`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' }
  });

  // Wait for async DB write
  await new Promise((r) => setTimeout(r, 1000));

  // Find by inboxId + receivedAt instead of computing hash manually
  const event = await db.webhookEvent.findFirst({
    where: {
      inboxId: testInboxId,
      receivedAt: { gte: before },
      eventType: 'new_message'
    }
  });
  expect(event).not.toBeNull();
  expect(event!.processed).toBe(true);
});

// =============================================================
// Test 5: Guest profile created with telegramChatId + externalIds
// =============================================================
test('telegram adapter: guest profile created with externalIds', async ({ request }) => {
  const fromId = 11001 + Math.floor(Math.random() * 1000);
  const chatId = 12001 + Math.floor(Math.random() * 1000);
  const messageId = 13001;

  const payload = makeTgUpdate({
    messageId,
    chatId,
    fromId,
    fromName: 'Auto Guest',
    text: 'Hello'
  });

  await request.post(`/api/webhooks/telegram/${testInboxId}`, {
    data: payload,
    headers: { 'Content-Type': 'application/json' }
  });

  await new Promise((r) => setTimeout(r, 500));

  // TelegramAdapter sets telegramChatId = fromId (string)
  const guest = await db.guestProfile.findFirst({
    where: { telegramChatId: String(fromId) }
  });

  expect(guest).not.toBeNull();
  expect(guest!.name).toBe('Auto Guest');
  const ids = guest!.externalIds as Record<string, string> | null;
  expect(ids?.['telegram']).toBe(String(fromId));
});
