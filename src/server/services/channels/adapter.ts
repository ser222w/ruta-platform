import type { ChannelType, Inbox } from '@prisma/client';

// =============================================================
// CHANNEL ADAPTER INTERFACE — central abstraction for all channels
// Every channel implements this interface.
// Core ingest pipeline works through this — zero channel-specific logic.
// =============================================================

export interface Attachment {
  url: string;
  mime: string;
  name: string;
  size?: number;
}

export type ParsedInboundEvent = {
  kind: 'new_message' | 'status_update' | 'delivery_receipt';
  /** Thread/chat ID in external channel (TG chat_id, email root Message-ID, SMS phone) */
  externalThreadId: string;
  /** Message ID for idempotency */
  externalMessageId: string;
  /** Sender external ID (TG from.id, email From:, phone number) */
  senderExternalId: string;
  senderName?: string;
  /** Per-channel metadata for GuestProfile upsert */
  senderMetadata?: {
    phone?: string;
    email?: string;
    telegramId?: string;
    viberId?: string;
    echatId?: string;
    username?: string;
    name?: string;
  };
  /** Normalized text content */
  content: string;
  attachments?: Attachment[];
  /** Raw channel payload — stored in Message.externalMetadata for debug */
  raw: unknown;
  receivedAt: Date;
};

export interface ChannelAdapter {
  readonly channelType: ChannelType;

  /**
   * Parse raw webhook body → normalized events.
   * Called from Hono handler after signature verification.
   */
  parseInbound(rawBody: Buffer, headers: Record<string, string>): Promise<ParsedInboundEvent[]>;

  /**
   * Send a message outbound to the guest.
   * Inbox.config contains channel-specific credentials.
   */
  sendMessage(
    inbox: Inbox,
    toExternalId: string,
    content: string,
    attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }>;

  /**
   * Verify webhook signature (Meta X-Hub-Signature-256, etc.)
   * Return true if valid, or if channel doesn't use signatures (secret-path pattern).
   */
  verifySignature?(rawBody: Buffer, headers: Record<string, string>): boolean;
}
