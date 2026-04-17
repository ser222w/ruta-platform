import { ImapFlow } from 'imapflow';
import { db } from '@/server/db';
import { processInboundWebhook } from './ingest';

// =============================================================
// GMAIL IMAP POLLING — runs as a cron/background job
// Polls all active EMAIL inboxes every 2 minutes
// Uses imapflow (modern IMAP client, supports Gmail OAuth & App Passwords)
//
// Inbox.config = {
//   imapHost: "imap.gmail.com",
//   imapPort: 993,
//   smtpUser: "odoo@rutahnr.com",   // also IMAP username
//   smtpPass: "rxvu xvvf azwg utnf", // Gmail App Password
//   ...
// }
// =============================================================

interface EmailInboxConfig {
  imapHost: string;
  imapPort: number;
  smtpUser: string;
  smtpPass: string;
  fromAddress?: string;
}

export async function pollEmailInboxes(): Promise<void> {
  const inboxes = await db.inbox.findMany({
    where: { channelType: 'EMAIL', isActive: true }
  });

  for (const inbox of inboxes) {
    const config = inbox.config as unknown as EmailInboxConfig;
    if (!config.imapHost || !config.smtpUser || !config.smtpPass) continue;

    try {
      await pollSingleInbox(inbox, config);
    } catch (err) {
      console.error(`[imap-poll] Error polling inbox ${inbox.id}:`, err);
    }
  }
}

async function pollSingleInbox(
  inbox: { id: string; channelType: string },
  config: EmailInboxConfig
): Promise<void> {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort ?? 993,
    secure: true,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    },
    logger: false // suppress verbose logs
  });

  await client.connect();

  try {
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Fetch only UNSEEN messages
      const messages = client.fetch('1:*', {
        uid: true,
        envelope: true,
        bodyStructure: true,
        source: true,
        flags: true
      });

      const toProcess: Array<{ uid: number; raw: Buffer }> = [];

      for await (const msg of messages) {
        // Skip already seen or messages without source
        if (msg.flags?.has('\\Seen')) continue;
        if (!msg.source) continue;

        toProcess.push({
          uid: msg.uid,
          raw: msg.source
        });
      }

      for (const { uid, raw } of toProcess) {
        // Convert raw RFC2822 email → our webhook JSON format via parseRawEmail
        const parsed = parseRawEmail(raw);
        if (!parsed) continue;

        const jsonBody = Buffer.from(JSON.stringify(parsed));
        await processInboundWebhook(inbox as never, jsonBody, {});

        // Mark as seen after processing
        await client.messageFlagsAdd({ uid }, ['\\Seen']);
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

// Parse raw RFC2822 email buffer → our EmailWebhookPayload shape
function parseRawEmail(raw: Buffer): Record<string, unknown> | null {
  const text = raw.toString('utf8');

  // Extract headers
  const headerEnd = text.indexOf('\r\n\r\n');
  if (headerEnd === -1) return null;

  const headerText = text.slice(0, headerEnd);
  const body = text.slice(headerEnd + 4);

  function getHeader(name: string): string {
    const re = new RegExp(`^${name}:\\s*(.+?)(?=\\r\\n(?!\\s)|$)`, 'im');
    const m = headerText.match(re);
    return m ? m[1]!.trim() : '';
  }

  const messageId = getHeader('Message-ID').replace(/[<>]/g, '') || `email-${Date.now()}`;
  const from = getHeader('From');
  const subject = getHeader('Subject');
  const inReplyTo = getHeader('In-Reply-To').replace(/[<>]/g, '');
  const references = getHeader('References');
  const date = getHeader('Date');

  // Extract name and email from From header: "Name <email>" or just "email"
  const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) ?? from.match(/^(.+)$/);
  const fromEmail = fromMatch?.[2] ?? fromMatch?.[1] ?? from;
  const fromName = fromMatch?.[2] ? fromMatch[1] : undefined;

  // Simple body: take plain text part (not multipart parsing)
  const textBody = body
    .replace(/=\r?\n/g, '')
    .replace(/=[0-9A-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(1), 16)));

  return {
    MessageID: messageId,
    From: from,
    FromFull: { Email: fromEmail, Name: fromName },
    Subject: subject,
    TextBody: textBody.slice(0, 10000),
    Headers: [
      { Name: 'In-Reply-To', Value: inReplyTo },
      { Name: 'References', Value: references }
    ].filter((h) => h.Value),
    Date: date || new Date().toISOString(),
    inReplyTo: inReplyTo || undefined,
    references: references || undefined
  };
}
