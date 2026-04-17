import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { bootstrapAdapters } from '@/server/services/channels/registry';
import { processInboundWebhook } from '@/server/services/channels/ingest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let bootstrapped = false;
async function ensureAdapters() {
  if (!bootstrapped) {
    await bootstrapAdapters();
    bootstrapped = true;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ inboxId: string }> }) {
  const { inboxId } = await params;
  await ensureAdapters();

  const inbox = await db.inbox.findUnique({ where: { id: inboxId } });
  if (!inbox) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!inbox.isActive) return NextResponse.json({ error: 'Inbox inactive' }, { status: 400 });

  const rawBody = Buffer.from(await req.arrayBuffer());
  const headers = Object.fromEntries(req.headers.entries());

  try {
    await processInboundWebhook(inbox, rawBody, headers);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook/echat] Error:', err);
    return NextResponse.json({ ok: true });
  }
}
