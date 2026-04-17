import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { getProjectEmployees } from '@/server/ringostat/api';

/**
 * POST /api/calls/sync-employees
 *
 * One-time (or periodic) sync of Ringostat employees → RUTA Users.
 * Updates phone, sipExtension, ringostatId, department for matched users (by email).
 * Only admins can trigger this.
 *
 * Usage:
 *   curl -X POST /api/calls/sync-employees -H "Cookie: session=..."
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only ADMIN or DIRECTOR can sync
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });
  if (!user || !['ADMIN', 'DIRECTOR'].includes(user.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch employees from Ringostat
  let employees;
  try {
    employees = await getProjectEmployees();
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch Ringostat employees' },
      { status: 502 }
    );
  }

  const results = {
    total: employees.length,
    matched: 0,
    created: 0,
    skipped: 0
  };

  for (const emp of employees) {
    if (!emp.email) {
      results.skipped++;
      continue;
    }

    // Try to find existing user by email
    const existing = await db.user.findUnique({
      where: { email: emp.email },
      select: { id: true }
    });

    if (existing) {
      // Update Ringostat fields
      await db.user.update({
        where: { id: existing.id },
        data: {
          phone: emp.phone ?? undefined,
          sipExtension: emp.sipAccount ?? undefined,
          ringostatId: emp.id,
          department: emp.department ?? undefined
        }
      });
      results.matched++;
    } else {
      // Employee exists in Ringostat but not in RUTA — skip (don't auto-create users)
      results.skipped++;
    }
  }

  return Response.json({
    ok: true,
    ...results,
    message: `Synced ${results.matched} users, skipped ${results.skipped} (no matching email)`
  });
}
