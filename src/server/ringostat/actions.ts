'use server';

import { auth } from '@/server/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { initiateCall, getSipStatus } from '@/server/ringostat/api';

// ─────────────────────────────────────────────
// B. Click-to-Call Server Action
// ─────────────────────────────────────────────

export async function callGuest(guestPhone: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { ok: false, error: 'Unauthorized' };
  }

  // Знаходимо SIP extension менеджера (зберігається в User.sipExtension або User.phone)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, phone: true, sipExtension: true }
  });

  if (!user) return { ok: false, error: 'User not found' };

  const extension = user.sipExtension ?? user.phone ?? user.email;
  if (!extension) {
    return { ok: false, error: 'No SIP extension configured for your account' };
  }

  return initiateCall({ extension, destination: guestPhone });
}

// ─────────────────────────────────────────────
// C. SIP Status — who is online/speaking
// ─────────────────────────────────────────────

export async function getManagersSipStatus() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  return getSipStatus();
}
