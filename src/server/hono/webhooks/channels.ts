import { Hono } from 'hono';
import { db } from '@/server/db';
import { bootstrapAdapters } from '@/server/services/channels/registry';
import { processInboundWebhook } from '@/server/services/channels/ingest';

// =============================================================
// GENERIC CHANNEL WEBHOOK ROUTER
// Pattern: /api/webhooks/{channel}/:inboxId
//
// Channels: telegram, email, echat
// SMS inbound: not implemented (TurboSMS outbound only)
//
// Security: inboxId is a cuid — unguessable, acts as secret path
// Signature verification: delegated to adapter.verifySignature()
// =============================================================

const channelWebhooks = new Hono();

// Bootstrap adapters once on first request (lazy init)
let adapterBootstrapped = false;
async function ensureAdapters() {
  if (!adapterBootstrapped) {
    await bootstrapAdapters();
    adapterBootstrapped = true;
  }
}

// ---------------------------------------------------------
// Generic handler — same logic for all channels
// ---------------------------------------------------------
async function handleWebhook(
  inboxId: string,
  rawBody: Buffer,
  headers: Record<string, string>
): Promise<{ ok: boolean; processed?: number; error?: string }> {
  await ensureAdapters();

  const inbox = await db.inbox.findUnique({ where: { id: inboxId } });
  if (!inbox) return { ok: false, error: 'Inbox not found' };
  if (!inbox.isActive) return { ok: false, error: 'Inbox inactive' };

  try {
    const result = await processInboundWebhook(inbox, rawBody, headers);
    return { ok: true, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Error processing inbox ${inboxId}:`, message);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------
// Telegram: POST /api/webhooks/telegram/:inboxId
// ---------------------------------------------------------
channelWebhooks.post('/telegram/:inboxId', async (c) => {
  const inboxId = c.req.param('inboxId');
  const rawBody = Buffer.from(await c.req.raw.clone().arrayBuffer());
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  const result = await handleWebhook(inboxId, rawBody, headers);

  if (!result.ok && result.error?.includes('not found')) {
    return c.text('Not Found', 404);
  }

  // Always return 200 to Telegram (prevents retry storms)
  return c.text('OK', 200);
});

// ---------------------------------------------------------
// Email: POST /api/webhooks/email/:inboxId
// (Postmark, Gmail forwarder, or any email-to-webhook service)
// ---------------------------------------------------------
channelWebhooks.post('/email/:inboxId', async (c) => {
  const inboxId = c.req.param('inboxId');
  const rawBody = Buffer.from(await c.req.raw.clone().arrayBuffer());
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  const result = await handleWebhook(inboxId, rawBody, headers);

  if (!result.ok && result.error?.includes('not found')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ ok: true }, 200);
});

// ---------------------------------------------------------
// e-chat: POST /api/webhooks/echat/:inboxId
// Handles both ECHAT_VIBER and ECHAT_TG_PERSONAL (per Inbox.channelType)
// ---------------------------------------------------------
channelWebhooks.post('/echat/:inboxId', async (c) => {
  const inboxId = c.req.param('inboxId');
  const rawBody = Buffer.from(await c.req.raw.clone().arrayBuffer());
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  const result = await handleWebhook(inboxId, rawBody, headers);

  if (!result.ok && result.error?.includes('not found')) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ ok: true }, 200);
});

// ---------------------------------------------------------
// Meta (Phase 2 stub) — GET for hub.challenge verify
// ---------------------------------------------------------
channelWebhooks.get('/meta', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return c.text(challenge ?? '', 200);
  }
  return c.text('Forbidden', 403);
});

channelWebhooks.post('/meta', async (c) => {
  // Phase 2: dispatch by entry[].id (page_id) to FB/IG/WA inbox
  // For now: return 200 to prevent Meta from disabling the webhook
  return c.text('OK', 200);
});

export default channelWebhooks;
