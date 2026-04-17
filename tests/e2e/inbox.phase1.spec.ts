import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// =============================================================
// INBOX PHASE 1 TESTS — TG + Email + SMS
// These tests verify the real adapters at integration level.
// Requires: real bot token, Postmark/email config, TurboSMS token
// Skip in CI if env vars not set.
// =============================================================

const db = new PrismaClient();

// ─────────────────────────────────────────────
// TG Bot round-trip (requires TELEGRAM_DEFAULT_BOT_TOKEN in env)
// ─────────────────────────────────────────────
test.describe('Telegram adapter', () => {
  test.skip(!process.env.TELEGRAM_DEFAULT_BOT_TOKEN, 'TELEGRAM_DEFAULT_BOT_TOKEN not set');

  test('telegram inbound webhook → creates conversation', async ({ request }) => {
    // Requires a TG Inbox in DB
    const inbox = await db.inbox.findFirst({
      where: { channelType: 'TELEGRAM', isActive: true }
    });
    test.skip(!inbox, 'No active TELEGRAM inbox in DB');

    const tgUpdate = {
      update_id: Math.floor(Math.random() * 1000000),
      message: {
        message_id: Math.floor(Math.random() * 100000),
        from: { id: 999000001, first_name: 'Telegram', last_name: 'Test', is_bot: false },
        chat: { id: 999000001, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'TG phase1 test'
      }
    };

    const response = await request.post(`/api/webhooks/telegram/${inbox!.id}`, {
      data: tgUpdate,
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(200);

    await new Promise((r) => setTimeout(r, 500));

    const conv = await db.conversation.findFirst({
      where: { inboxId: inbox!.id, externalThreadId: '999000001' },
      include: { messages: { take: 1 } }
    });

    expect(conv).not.toBeNull();
    expect(conv!.messages[0]!.content).toBe('TG phase1 test');
  });
});

// ─────────────────────────────────────────────
// Email inbound (simulated Postmark webhook)
// ─────────────────────────────────────────────
test.describe('Email adapter', () => {
  test('email inbound webhook → creates conversation with threading', async ({ request }) => {
    const inbox = await db.inbox.findFirst({
      where: { channelType: 'EMAIL', isActive: true }
    });
    test.skip(!inbox, 'No active EMAIL inbox in DB');

    const rootMessageId = `<root-${Date.now()}@test.example>`;
    const messageId2 = `<reply-${Date.now()}@test.example>`;

    // First email (root)
    const postmarkPayload1 = {
      MessageID: rootMessageId,
      From: 'guest@example.com',
      FromFull: { Email: 'guest@example.com', Name: 'Email Test Guest' },
      Subject: 'Запит на бронювання',
      TextBody: 'Привіт! Цікавить номер на червень.',
      HtmlBody: '',
      Headers: [{ Name: 'Message-ID', Value: rootMessageId }],
      Attachments: [],
      Date: new Date().toISOString()
    };

    const res1 = await request.post(`/api/webhooks/email/${inbox!.id}`, {
      data: postmarkPayload1,
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res1.status()).toBe(200);

    await new Promise((r) => setTimeout(r, 500));

    const conv = await db.conversation.findFirst({
      where: { inboxId: inbox!.id, externalThreadId: rootMessageId },
      include: { messages: true }
    });
    expect(conv).not.toBeNull();

    // Second email (reply in thread)
    const postmarkPayload2 = {
      MessageID: messageId2,
      From: 'guest@example.com',
      FromFull: { Email: 'guest@example.com', Name: 'Email Test Guest' },
      Subject: 'Re: Запит на бронювання',
      TextBody: 'Дякую за відповідь!',
      HtmlBody: '',
      Headers: [
        { Name: 'Message-ID', Value: messageId2 },
        { Name: 'In-Reply-To', Value: rootMessageId },
        { Name: 'References', Value: rootMessageId }
      ],
      Attachments: [],
      Date: new Date().toISOString()
    };

    await request.post(`/api/webhooks/email/${inbox!.id}`, {
      data: postmarkPayload2,
      headers: { 'Content-Type': 'application/json' }
    });

    await new Promise((r) => setTimeout(r, 500));

    // Same conversation should have 2 messages now
    const updatedConv = await db.conversation.findFirst({
      where: { inboxId: inbox!.id, externalThreadId: rootMessageId },
      include: { messages: true }
    });

    expect(updatedConv!.messages).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────
// TurboSMS outbound send
// ─────────────────────────────────────────────
test.describe('TurboSMS adapter', () => {
  test.skip(
    !process.env.TURBOSMS_API_TOKEN || !process.env.TURBOSMS_TEST_PHONE,
    'TURBOSMS_API_TOKEN or TURBOSMS_TEST_PHONE not set'
  );

  test('sms outbound — sends message via TurboSMS API', async () => {
    const inbox = await db.inbox.findFirst({
      where: { channelType: 'SMS', isActive: true }
    });
    test.skip(!inbox, 'No active SMS inbox in DB');

    // Create test conversation for SMS
    const guest = await db.guestProfile.create({
      data: {
        name: 'SMS Test Guest',
        phone: process.env.TURBOSMS_TEST_PHONE,
        externalIds: { phone: process.env.TURBOSMS_TEST_PHONE }
      }
    });

    const conv = await db.conversation.create({
      data: {
        inboxId: inbox!.id,
        channel: 'SMS',
        externalThreadId: process.env.TURBOSMS_TEST_PHONE,
        guestId: guest.id,
        status: 'OPEN'
      }
    });

    // Trigger send via tRPC would need auth — use service directly
    const { sendChannelMessage } = await import('@/server/services/channels/send');
    const { bootstrapAdapters } = await import('@/server/services/channels/registry');
    await bootstrapAdapters();

    const msg = await sendChannelMessage(conv.id, 'RUTA OS test SMS — Phase 1 E2E', 'system');

    expect(msg.direction).toBe('OUTBOUND');
    expect(msg.externalId).toBeTruthy();

    // Cleanup
    await db.conversation.delete({ where: { id: conv.id } });
    await db.guestProfile.delete({ where: { id: guest.id } });
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});
