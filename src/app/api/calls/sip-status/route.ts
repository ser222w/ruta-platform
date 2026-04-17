import { auth } from '@/server/auth';
import { getSipStatus } from '@/server/ringostat/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calls/sip-status
 *
 * Returns which manager SIP accounts are online and speaking.
 * Used by UI to show availability indicators on manager cards.
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await getSipStatus();
  return Response.json(status);
}
