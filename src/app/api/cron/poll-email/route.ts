import { NextRequest, NextResponse } from 'next/server';
import { pollEmailInboxes } from '@/server/services/channels/imap-poll';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Called by Coolify cron or external cron every 2 minutes
// Secured by CRON_SECRET header
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await pollEmailInboxes();
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[cron/poll-email]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
