import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// SMS ADAPTER — TurboSMS (outbound only)
// https://turbosms.ua/api.html
//
// Inbox.config = {
//   apiToken: string,     // TurboSMS API token
//   senderName: string,   // Alphanumeric sender (e.g. "RUTA") or numeric
// }
//
// Inbound: not implemented (requires dedicated number + TurboSMS webhook plan)
// Outbound: REST API POST to /message/send.json
// =============================================================

const TURBOSMS_API = 'https://api.turbosms.ua/message/send.json';

interface TurboSmsConfig {
  apiToken: string;
  senderName: string;
}

interface TurboSmsResponse {
  response_code: number;
  response_status: string;
  response_result?: Array<{
    phone: string;
    response_code: number;
    message_id: string;
  }>;
}

export class SmsAdapter implements ChannelAdapter {
  readonly channelType = 'SMS' as const;

  async parseInbound(_rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    // TurboSMS inbound not supported in Phase 1
    // Return empty — no webhook handler registered for inbound SMS
    return [];
  }

  async sendMessage(
    inbox: Inbox,
    toExternalId: string,
    content: string,
    _attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }> {
    const config = inbox.config as unknown as TurboSmsConfig;

    if (!config.apiToken) {
      throw new Error(`SMS inbox ${inbox.id} missing apiToken in config`);
    }

    // Normalize phone: ensure starts with +380 or country code
    const phone = normalizePhone(toExternalId);

    const response = await fetch(TURBOSMS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`
      },
      body: JSON.stringify({
        recipients: [phone],
        sms: {
          sender: config.senderName ?? 'RutaResort',
          text: content
        }
      })
    });

    if (!response.ok) {
      throw new Error(`TurboSMS API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as TurboSmsResponse;

    if (data.response_code !== 0) {
      throw new Error(`TurboSMS send failed: ${data.response_status} (code ${data.response_code})`);
    }

    const messageId = data.response_result?.[0]?.message_id ?? `sms-${Date.now()}`;

    return { externalMessageId: messageId };
  }
}

function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Ukrainian number: 380XXXXXXXXX
  if (digits.startsWith('380') && digits.length === 12) return `+${digits}`;
  // Local format: 0XXXXXXXXX → +380XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 10) return `+38${digits}`;
  // Already has +
  if (phone.startsWith('+')) return phone;
  // Fallback
  return `+${digits}`;
}
