import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// FAKE ADAPTER — used in tests via registry override
// Simulates a TELEGRAM channel without real bot credentials
// =============================================================

export interface FakeWebhookPayload {
  messageId: string;
  chatId: string;
  fromId: string;
  fromName?: string;
  text: string;
  timestamp?: number;
}

export class FakeAdapter implements ChannelAdapter {
  readonly channelType = 'TELEGRAM' as const;

  async parseInbound(rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    const payload = JSON.parse(rawBody.toString()) as FakeWebhookPayload;

    return [
      {
        kind: 'new_message',
        externalThreadId: payload.chatId,
        externalMessageId: payload.messageId,
        senderExternalId: payload.fromId,
        senderName: payload.fromName ?? 'Test Guest',
        senderMetadata: {
          telegramId: payload.fromId,
          name: payload.fromName
        },
        content: payload.text,
        raw: payload,
        receivedAt: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date()
      }
    ];
  }

  async sendMessage(
    _inbox: Inbox,
    _toExternalId: string,
    content: string,
    _attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }> {
    // In tests: just return a fake message ID
    return { externalMessageId: `fake-out-${Date.now()}` };
  }

  // No signature verification for fake adapter
}
