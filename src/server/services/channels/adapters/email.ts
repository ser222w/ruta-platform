import nodemailer from 'nodemailer';
import type { Inbox } from '@prisma/client';
import type { ChannelAdapter, ParsedInboundEvent, Attachment } from '../adapter';

// =============================================================
// EMAIL ADAPTER
// Inbound: POST webhook from Gmail/Postmark forwarding JSON
// Outbound: Gmail SMTP via nodemailer (app password)
//
// Inbox.config = {
//   smtpHost: string,         // "smtp.gmail.com"
//   smtpPort: number,         // 587
//   smtpUser: string,         // "odoo@rutahnr.com"
//   smtpPass: string,         // Gmail app password
//   fromAddress: string,      // "RUTA Hotels <odoo@rutahnr.com>"
//   inboundSecret?: string,   // Optional secret in webhook path for security
// }
//
// Thread detection: In-Reply-To + References headers
// externalThreadId = root Message-ID of the thread
// =============================================================

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromAddress: string;
  inboundSecret?: string;
}

// Postmark inbound webhook JSON shape (subset we care about)
interface PostmarkInboundPayload {
  MessageID: string;
  From: string;
  FromFull: { Email: string; Name?: string };
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  Headers: Array<{ Name: string; Value: string }>;
  Attachments?: Array<{
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength: number;
  }>;
  Date: string;
}

// Generic email webhook — supports both Postmark and simple JSON forwarding
type EmailWebhookPayload = PostmarkInboundPayload & {
  // Gmail/custom forwarder alternative fields
  messageId?: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  date?: string;
  inReplyTo?: string;
  references?: string;
};

export class EmailAdapter implements ChannelAdapter {
  readonly channelType = 'EMAIL' as const;

  async parseInbound(rawBody: Buffer): Promise<ParsedInboundEvent[]> {
    const payload = JSON.parse(rawBody.toString()) as EmailWebhookPayload;

    // Normalize across Postmark and generic JSON
    const messageId = payload.MessageID ?? payload.messageId ?? `email-${Date.now()}`;
    const fromEmail = payload.FromFull?.Email ?? payload.from ?? '';
    const fromName = payload.FromFull?.Name ?? extractNameFromEmail(fromEmail);
    const subject = payload.Subject ?? payload.subject ?? '';
    const textBody = payload.TextBody ?? payload.text ?? '';
    const htmlBody = payload.HtmlBody ?? payload.html ?? '';
    const content = textBody.trim() || stripHtml(htmlBody) || `[Email: ${subject}]`;

    // Thread detection: resolve root message-ID for thread grouping
    const inReplyTo = getHeader(payload, 'In-Reply-To') ?? payload.inReplyTo;
    const references = getHeader(payload, 'References') ?? payload.references;
    const externalThreadId = resolveThreadId(messageId, inReplyTo, references);

    // Attachments
    const attachments: Attachment[] = (payload.Attachments ?? []).map((a) => ({
      url: `data:${a.ContentType};base64,${a.Content}`, // placeholder — upload to R2 in production
      mime: a.ContentType,
      name: a.Name,
      size: a.ContentLength
    }));

    return [
      {
        kind: 'new_message',
        externalThreadId,
        externalMessageId: messageId,
        senderExternalId: fromEmail,
        senderName: fromName || undefined,
        senderMetadata: {
          email: fromEmail,
          name: fromName || undefined
        },
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
        raw: payload,
        receivedAt: new Date(payload.Date ?? payload.date ?? Date.now())
      }
    ];
  }

  async sendMessage(
    inbox: Inbox,
    toExternalId: string,
    content: string,
    _attachments?: Attachment[]
  ): Promise<{ externalMessageId: string }> {
    const config = inbox.config as unknown as EmailConfig;

    const transporter = nodemailer.createTransport({
      host: config.smtpHost ?? 'smtp.gmail.com',
      port: config.smtpPort ?? 587,
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      }
    });

    const info = await transporter.sendMail({
      from: config.fromAddress ?? config.smtpUser,
      to: toExternalId,
      subject: 'RUTA Hotels',
      text: content
    });

    return { externalMessageId: info.messageId ?? `sent-${Date.now()}` };
  }

  // Email uses secret-in-path or Postmark webhook signing — basic for now
  verifySignature(_rawBody: Buffer, headers: Record<string, string>): boolean {
    // If Postmark-Token header present, could verify against config.inboundSecret
    // For now: rely on secret path (/api/webhooks/email/:inboxId where inboxId is unguessable)
    void headers;
    return true;
  }
}

// =============================================================
// Helpers
// =============================================================

function getHeader(payload: PostmarkInboundPayload, name: string): string | undefined {
  return payload.Headers?.find((h) => h.Name.toLowerCase() === name.toLowerCase())?.Value;
}

/**
 * Determine the thread root ID for grouping emails into one Conversation.
 * Priority: first Message-ID in References chain → In-Reply-To → current message ID
 */
function resolveThreadId(messageId: string, inReplyTo?: string, references?: string): string {
  if (references) {
    const ids = references.trim().split(/\s+/);
    if (ids.length > 0 && ids[0]) return ids[0];
  }
  if (inReplyTo) return inReplyTo.trim();
  return messageId;
}

function extractNameFromEmail(email: string): string {
  const match = email.match(/^(.+?)\s*</);
  return match?.[1]?.trim() ?? '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
