import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// E-CHAT ADAPTER — Viber + TG Personal (via e-chat.tech)
// API key: 69af29385a4d0
// Sender phone: +380987330000
//
// Inbox.config = {
//   apiKey: string,           // e-chat API key
//   channel: 'viber' | 'tg_personal',
//   senderId: string,         // sender phone or ID
// }
//
// NOTE: e-chat.tech API docs are not publicly indexed.
// Endpoints below are based on their typical REST pattern.
// Verify against actual docs at: https://help.e-chat.tech
// Update ECHAT_API_BASE and payload fields after verification.
// =============================================================

const ECHAT_API_BASE = 'https://api.e-chat.tech/v1';

interface EchatConfig {
  apiKey: string;
  channel: 'viber' | 'tg_personal';
  senderId: string;
}

// Inbound webhook payload from e-chat (approximate shape — verify with docs)
interface EchatWebhookPayload {
  event: 'message' | 'delivered' | 'seen' | 'failed';
  channel: 'viber' | 'tg';
  message_id: string;
  chat_id: string;
  sender: {
    id: string;
    name?: string;
    phone?: string;
  };
  message?: {
    type: 'text' | 'image' | 'file' | 'video' | 'audio';
    text?: string;
    url?: string;
    filename?: string;
    mime?: string;
    size?: number;
  };
  timestamp: number;
}

// Outbound send payload (approximate — verify with e-chat docs)
interface EchatSendPayload {
  api_key: string;
  channel: string;
  to: string;
  sender: string;
  message: {
    type: 'text';
    text: string;
  };
}

class EchatBaseAdapter implements ChannelAdapter {
  readonly channelType: 'ECHAT_VIBER' | 'ECHAT_TG_PERSONAL';
  private readonly echatChannel: 'viber' | 'tg';

  constructor(channelType: 'ECHAT_VIBER' | 'ECHAT_TG_PERSONAL', echatChannel: 'viber' | 'tg') {
    this.channelType = channelType;
    this.echatChannel = echatChannel;
  }

  async parseInbound(rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    const payload = JSON.parse(rawBody.toString()) as EchatWebhookPayload;

    if (payload.event !== 'message') return [];
    if (!payload.message) return [];

    const content = payload.message.text ?? `[${payload.message.type}]`;
    const chatId = payload.chat_id ?? payload.sender.id;

    const attachments: Attachment[] = [];
    if (payload.message.url && payload.message.type !== 'text') {
      attachments.push({
        url: payload.message.url,
        mime: payload.message.mime ?? 'application/octet-stream',
        name: payload.message.filename ?? `file_${payload.message_id}`,
        size: payload.message.size
      });
    }

    return [
      {
        kind: 'new_message',
        externalThreadId: chatId,
        externalMessageId: payload.message_id,
        senderExternalId: payload.sender.id,
        senderName: payload.sender.name,
        senderMetadata: {
          phone: payload.sender.phone,
          name: payload.sender.name,
          ...(this.echatChannel === 'viber'
            ? { viberId: payload.sender.id }
            : { echatId: payload.sender.id })
        },
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
        raw: payload,
        receivedAt: new Date(payload.timestamp * 1000)
      }
    ];
  }

  async sendMessage(
    inbox: Inbox,
    toExternalId: string,
    content: string,
    _attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }> {
    const config = inbox.config as unknown as EchatConfig;

    if (!config.apiKey) {
      throw new Error(`e-chat inbox ${inbox.id} missing apiKey in config`);
    }

    const body: EchatSendPayload = {
      api_key: config.apiKey,
      channel: this.echatChannel,
      to: toExternalId,
      sender: config.senderId,
      message: {
        type: 'text',
        text: content
      }
    };

    // TODO: verify actual endpoint URL from e-chat.tech docs
    const response = await fetch(`${ECHAT_API_BASE}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`e-chat API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { message_id?: string; id?: string };
    return { externalMessageId: data.message_id ?? data.id ?? `echat-${Date.now()}` };
  }
}

export class EchatViberAdapter extends EchatBaseAdapter {
  constructor() {
    super('ECHAT_VIBER', 'viber');
  }
}

export class EchatTgPersonalAdapter extends EchatBaseAdapter {
  constructor() {
    super('ECHAT_TG_PERSONAL', 'tg');
  }
}
