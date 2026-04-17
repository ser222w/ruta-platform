import { db } from '@/server/db';
import { getAdapter } from './registry';
import type { Attachment } from './adapter';

// =============================================================
// OUTBOUND SEND — channel-agnostic
// Resolves adapter from conversation's inbox, delegates to adapter.sendMessage
// =============================================================

export async function sendChannelMessage(
  conversationId: string,
  content: string,
  senderId: string,
  attachments?: Attachment[]
) {
  const conversation = await db.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { inbox: true }
  });

  const adapter = getAdapter(conversation.inbox.channelType);

  // Resolve destination external ID
  // For most channels: externalThreadId = chat_id / phone / email thread
  const toExternalId = await resolveToExternalId(conversation);

  const { externalMessageId } = await adapter.sendMessage(
    conversation.inbox,
    toExternalId,
    content,
    attachments
  );

  // Persist the outbound message
  const message = await db.message.create({
    data: {
      conversationId,
      inboxId: conversation.inboxId,
      direction: 'OUTBOUND',
      content,
      externalId: externalMessageId,
      sentById: senderId,
      attachments: attachments ? (attachments as never) : undefined
    }
  });

  // Update conversation state
  await db.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() }
  });

  return message;
}

async function resolveToExternalId(conversation: {
  externalThreadId: string | null;
  guestId: string | null;
  channel: string;
}): Promise<string> {
  // Primary: use externalThreadId (chat_id, phone, email thread)
  if (conversation.externalThreadId) {
    return conversation.externalThreadId;
  }

  // Fallback: look up guest's external ID for this channel
  if (conversation.guestId) {
    const guest = await db.guestProfile.findUnique({
      where: { id: conversation.guestId }
    });
    if (guest) {
      const channelKey = channelToExternalIdKey(conversation.channel);
      if (channelKey) {
        const ids = guest.externalIds as Record<string, string> | null;
        const id =
          ids?.[channelKey] ??
          (channelKey === 'telegram'
            ? guest.telegramChatId
            : channelKey === 'phone'
              ? guest.phone
              : channelKey === 'email'
                ? guest.email
                : null);
        if (id) return id;
      }
    }
  }

  throw new Error(
    `Cannot resolve destination for conversation ${conversation.externalThreadId} (channel: ${conversation.channel})`
  );
}

function channelToExternalIdKey(channel: string): string | null {
  const map: Record<string, string> = {
    TELEGRAM: 'telegram',
    ECHAT_TG_PERSONAL: 'telegram',
    ECHAT_VIBER: 'echat_viber',
    SMS: 'phone',
    EMAIL: 'email',
    WHATSAPP: 'phone',
    FACEBOOK: 'facebook',
    INSTAGRAM: 'instagram'
  };
  return map[channel] ?? null;
}
