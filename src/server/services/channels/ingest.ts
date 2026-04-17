import crypto from 'crypto';
import { db } from '@/server/db';
import { getAdapter } from './registry';
import type { Inbox } from '@prisma/client';
import type { ParsedInboundEvent } from './adapter';

// =============================================================
// INGEST PIPELINE — channel-agnostic
// 1. Parse raw webhook → ParsedInboundEvent[]
// 2. For each event:
//    - idempotency check
//    - upsert GuestProfile
//    - find or create Conversation
//    - create Message
//    - update conversation state
//    - create Inquiry if new conversation
//    - pg_notify → SSE broadcast
// =============================================================

export function computeEventId(inboxId: string, externalMessageId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${inboxId}:${externalMessageId}`)
    .digest('hex')
    .slice(0, 32);
}

export async function processInboundWebhook(
  inbox: Inbox,
  rawBody: Buffer,
  headers: Record<string, string>
): Promise<{ processed: number; skipped: number }> {
  const adapter = getAdapter(inbox.channelType);

  // Signature verification (Meta pattern, optional per-adapter)
  if (adapter.verifySignature && !adapter.verifySignature(rawBody, headers)) {
    throw new Error(`Invalid signature for inbox ${inbox.id}`);
  }

  const events = await adapter.parseInbound(rawBody, headers);
  let processed = 0;
  let skipped = 0;

  for (const event of events) {
    const eventId = computeEventId(inbox.id, event.externalMessageId);

    // Idempotency: skip if already processed
    const existing = await db.webhookEvent.findUnique({ where: { id: eventId } });
    if (existing?.processed) {
      skipped++;
      continue;
    }

    // Create WebhookEvent record (idempotency log)
    await db.webhookEvent.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        inboxId: inbox.id,
        channel: inbox.channelType,
        eventType: event.kind,
        payload: event.raw as never
      },
      update: { attempts: { increment: 1 } }
    });

    try {
      await processEvent(inbox, event);

      await db.webhookEvent.update({
        where: { id: eventId },
        data: { processed: true }
      });

      processed++;
    } catch (err) {
      await db.webhookEvent.update({
        where: { id: eventId },
        data: {
          error: err instanceof Error ? err.message : String(err),
          attempts: { increment: 1 }
        }
      });
      // Don't rethrow — return 200 to channel (prevent retries flooding)
      console.error(`[ingest] Failed to process event ${eventId}:`, err);
    }
  }

  return { processed, skipped };
}

async function processEvent(inbox: Inbox, event: ParsedInboundEvent): Promise<void> {
  if (event.kind !== 'new_message') return;

  // 1. Upsert GuestProfile
  const guest = await upsertGuest(event);

  // 2. Find or create Conversation
  const { conversation, isNew } = await findOrCreateConversation(
    inbox,
    event.externalThreadId,
    guest?.id
  );

  // 3. Idempotency: check if message already exists
  const existingMsg = await db.message.findFirst({
    where: { inboxId: inbox.id, externalId: event.externalMessageId }
  });
  if (existingMsg) return;

  // 4. Create Message
  await db.message.create({
    data: {
      conversationId: conversation.id,
      inboxId: inbox.id,
      direction: 'INBOUND',
      content: event.content,
      externalId: event.externalMessageId,
      externalMetadata: event.raw as never,
      attachments: event.attachments ? (event.attachments as never) : undefined
    }
  });

  // 5. Update conversation state
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: event.receivedAt,
      unreadByManager: true
    }
  });

  // 6. If new conversation → create Inquiry
  if (isNew) {
    const inquirySource = channelTypeToInquirySource(inbox.channelType);
    await db.inquiry.create({
      data: {
        source: inquirySource,
        status: 'NEW',
        guestId: guest?.id,
        propertyId: inbox.brandId ?? undefined,
        contactName: event.senderName,
        contactPhone: event.senderMetadata?.phone,
        conversationId: conversation.id
      }
    });
  }

  // 7. pg_notify → SSE broadcast
  await db.$executeRawUnsafe(
    `SELECT pg_notify('new_message', $1::text)`,
    JSON.stringify({
      conversationId: conversation.id,
      inboxId: inbox.id,
      channel: inbox.channelType
    })
  );
}

async function upsertGuest(event: ParsedInboundEvent) {
  const meta = event.senderMetadata;
  if (!meta) return null;

  // Build lookup conditions — try to find existing guest
  const phone = meta.phone;
  const email = meta.email;
  const telegramId = meta.telegramId;

  // Find existing guest by known identifiers
  let guest = null;

  if (phone) {
    guest = await db.guestProfile.findFirst({ where: { phone } });
  }
  if (!guest && email) {
    guest = await db.guestProfile.findFirst({ where: { email } });
  }
  if (!guest && telegramId) {
    guest = await db.guestProfile.findFirst({ where: { telegramChatId: telegramId } });
  }

  if (guest) {
    // Update externalIds JSON to include new channel IDs
    const existingIds = (guest.externalIds as Record<string, string>) ?? {};
    const newIds = buildExternalIds(meta, existingIds);

    if (JSON.stringify(newIds) !== JSON.stringify(existingIds)) {
      await db.guestProfile.update({
        where: { id: guest.id },
        data: {
          externalIds: newIds,
          ...(telegramId && !guest.telegramChatId ? { telegramChatId: telegramId } : {})
        }
      });
    }
    return guest;
  }

  // Create new guest
  return db.guestProfile.create({
    data: {
      name: event.senderName ?? meta.name ?? 'Невідомий гість',
      phone: phone ?? undefined,
      email: email ?? undefined,
      telegramChatId: telegramId ?? undefined,
      externalIds: buildExternalIds(meta, {})
    }
  });
}

function buildExternalIds(
  meta: NonNullable<ParsedInboundEvent['senderMetadata']>,
  existing: Record<string, string>
): Record<string, string> {
  const ids = { ...existing };
  if (meta.telegramId) ids['telegram'] = meta.telegramId;
  if (meta.email) ids['email'] = meta.email;
  if (meta.phone) ids['phone'] = meta.phone;
  if (meta.viberId) ids['echat_viber'] = meta.viberId;
  if (meta.echatId) ids['echat'] = meta.echatId;
  return ids;
}

async function findOrCreateConversation(
  inbox: Inbox,
  externalThreadId: string,
  guestId: string | undefined
): Promise<{ conversation: { id: string }; isNew: boolean }> {
  const existing = await db.conversation.findUnique({
    where: {
      inboxId_externalThreadId: { inboxId: inbox.id, externalThreadId }
    }
  });

  if (existing) {
    return { conversation: existing, isNew: false };
  }

  const created = await db.conversation.create({
    data: {
      inboxId: inbox.id,
      channel: inbox.channelType,
      externalThreadId,
      guestId: guestId ?? undefined,
      status: 'OPEN',
      unreadByManager: true
    }
  });

  return { conversation: created, isNew: true };
}

function channelTypeToInquirySource(
  channelType: string
): 'TELEGRAM' | 'WHATSAPP' | 'INSTAGRAM' | 'VIBER' | 'SITE_FORM' | 'MANUAL' {
  const map: Record<string, ReturnType<typeof channelTypeToInquirySource>> = {
    TELEGRAM: 'TELEGRAM',
    ECHAT_TG_PERSONAL: 'TELEGRAM',
    WHATSAPP: 'WHATSAPP',
    INSTAGRAM: 'INSTAGRAM',
    FACEBOOK: 'MANUAL',
    ECHAT_VIBER: 'VIBER',
    EMAIL: 'SITE_FORM',
    SMS: 'MANUAL'
  };
  return map[channelType] ?? 'MANUAL';
}
