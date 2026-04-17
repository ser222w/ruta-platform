import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// E-CHAT ADAPTER — Telegram Personal API (via telegram.e-chat.tech)
// Docs: e-chat.rtf
//
// Auth: header "API: <apiKey>"
// Base: https://telegram.e-chat.tech
//
// Inbound webhook payload (IncomingMessage):
//   { direction, number, sender: { id, name, phone, username }, message: { id, telegram_id, text, type, ... } }
//
// Outbound: POST /SendMessage.php
//   body: { user: { number }, message: { id, text }, receiver: { id?, username?, phone? } }
//
// Inbox.config = {
//   apiKey: string,    // e-chat API key (per phone number)
//   number: string,    // your e-chat phone number e.g. "380987330000"
// }
// =============================================================

const ECHAT_BASE = 'https://telegram.e-chat.tech/api';

interface EchatConfig {
  apiKey: string;
  number: string; // sender phone number in e-chat account
}

// Inbound webhook from e-chat (IncomingMessage event)
interface EchatIncomingMessage {
  direction: 'incoming' | 'outgoing';
  number: string; // your phone number
  sender: {
    id: string;
    name?: string;
    phone?: string;
    username?: string;
    photo?: string;
  };
  message: {
    id: string;
    telegram_id?: string;
    datetime?: string;
    text?: string;
    type: 'text' | 'media';
    file_name?: string;
    file_size?: string;
    media?: string;
    reply_to?: string;
    fwd_from?: string;
  };
}

class EchatBaseAdapter implements ChannelAdapter {
  readonly channelType: 'ECHAT_VIBER' | 'ECHAT_TG_PERSONAL';

  constructor(channelType: 'ECHAT_VIBER' | 'ECHAT_TG_PERSONAL') {
    this.channelType = channelType;
  }

  async parseInbound(rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    const payload = JSON.parse(rawBody.toString()) as EchatIncomingMessage;

    // Only process incoming messages (not delivery status confirmations)
    if (payload.direction !== 'incoming') return [];
    if (!payload.message) return [];

    const content = payload.message.text ?? `[${payload.message.type}]`;
    const senderId = payload.sender.id;
    // Thread = sender ID (each contact is one conversation)
    const threadId = senderId;

    const attachments: Attachment[] = [];
    if (payload.message.media && payload.message.type !== 'text') {
      attachments.push({
        url: payload.message.media,
        mime: 'application/octet-stream',
        name: payload.message.file_name ?? `file_${payload.message.id}`,
        size: payload.message.file_size ? parseInt(payload.message.file_size) : undefined
      });
    }

    return [
      {
        kind: 'new_message',
        externalThreadId: threadId,
        externalMessageId: payload.message.id,
        senderExternalId: senderId,
        senderName: payload.sender.name,
        senderMetadata: {
          phone: payload.sender.phone,
          name: payload.sender.name,
          username: payload.sender.username,
          echatId: senderId
        },
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
        raw: payload,
        receivedAt: payload.message.datetime ? new Date(payload.message.datetime) : new Date()
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

    if (!config.apiKey || !config.number) {
      throw new Error(`e-chat inbox ${inbox.id} missing apiKey or number in config`);
    }

    // e-chat SendMessage.php — receiver can be identified by id (sender.id from inbound)
    const body = {
      user: { number: config.number },
      message: {
        id: `ruta-${Date.now()}`,
        text: content
      },
      receiver: {
        id: toExternalId
      }
    };

    const response = await fetch(`${ECHAT_BASE}/SendMessage.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        API: config.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`e-chat API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      status: string;
      message_id?: string;
      description?: string;
    };

    if (data.status !== 'SUCCESS') {
      throw new Error(`e-chat send failed: ${data.description ?? data.status}`);
    }

    return { externalMessageId: data.message_id ?? `echat-${Date.now()}` };
  }
}

export class EchatViberAdapter extends EchatBaseAdapter {
  constructor() {
    super('ECHAT_VIBER');
  }
}

export class EchatTgPersonalAdapter extends EchatBaseAdapter {
  constructor() {
    super('ECHAT_TG_PERSONAL');
  }
}
