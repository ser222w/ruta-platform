import { Bot } from 'grammy';
import type { Update } from '@grammyjs/types';
import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// TELEGRAM ADAPTER
// - Multi-bot: each Inbox has its own botToken in config
// - Webhook mode (not polling)
// - Inbox.config = { botToken: string }
// =============================================================

interface TelegramConfig {
  botToken: string;
}

export class TelegramAdapter implements ChannelAdapter {
  readonly channelType = 'TELEGRAM' as const;

  async parseInbound(rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    const update = JSON.parse(rawBody.toString()) as Update;

    // Only handle regular messages (ignore edited_message, channel_post, etc.)
    const msg = update.message;
    if (!msg) return [];

    const chatId = String(msg.chat.id);
    const fromId = String(msg.from?.id ?? msg.chat.id);
    const fromName =
      [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || undefined;
    const fromUsername = msg.from?.username;

    const content = msg.text ?? msg.caption ?? '';
    if (!content && !msg.photo && !msg.document && !msg.audio && !msg.video) return [];

    // Build attachments for media messages
    const attachments: Attachment[] = [];
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1]; // largest size
      attachments.push({
        url: `tg://file/${photo.file_id}`, // resolved via getFile API if needed
        mime: 'image/jpeg',
        name: `photo_${photo.file_id}.jpg`,
        size: photo.file_size
      });
    }
    if (msg.document) {
      attachments.push({
        url: `tg://file/${msg.document.file_id}`,
        mime: msg.document.mime_type ?? 'application/octet-stream',
        name: msg.document.file_name ?? `file_${msg.document.file_id}`,
        size: msg.document.file_size
      });
    }

    return [
      {
        kind: 'new_message',
        externalThreadId: chatId,
        externalMessageId: `${chatId}_${msg.message_id}`,
        senderExternalId: fromId,
        senderName: fromName,
        senderMetadata: {
          telegramId: fromId,
          name: fromName,
          username: fromUsername
        },
        content: content || '[медіа]',
        attachments: attachments.length > 0 ? attachments : undefined,
        raw: update,
        receivedAt: new Date(msg.date * 1000)
      }
    ];
  }

  async sendMessage(
    inbox: Inbox,
    toExternalId: string,
    content: string,
    _attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }> {
    const config = inbox.config as unknown as TelegramConfig;
    if (!config.botToken) {
      throw new Error(`Telegram inbox ${inbox.id} missing botToken in config`);
    }

    const bot = new Bot(config.botToken);
    const sent = await bot.api.sendMessage(toExternalId, content);

    return { externalMessageId: `${toExternalId}_${sent.message_id}` };
  }

  // Telegram uses secret-path webhook URLs (no signature header)
  // verifySignature not implemented — security via unguessable inboxId in URL
}

// =============================================================
// CLI HELPER: set webhook for a Telegram inbox
// Usage: npx tsx src/server/services/channels/adapters/telegram.ts <inboxId> <baseUrl>
// =============================================================
export async function setTelegramWebhook(botToken: string, webhookUrl: string): Promise<void> {
  const bot = new Bot(botToken);
  await bot.api.setWebhook(webhookUrl);
  console.log(`Telegram webhook set: ${webhookUrl}`);
}
