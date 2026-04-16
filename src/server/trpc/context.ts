import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { defineAbilitiesFor } from '@/server/services/abilities';
import type { MongoAbility } from '@casl/ability';

export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: opts.headers });

  let ability: MongoAbility | null = null;
  let dbUser: {
    id: string;
    role: import('@prisma/client').Role;
    email: string;
    name: string;
  } | null = null;

  if (session?.user?.id) {
    dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true, name: true }
    });
    if (dbUser) {
      ability = defineAbilitiesFor(dbUser.role, dbUser.id);
    }
  }

  return { session, user: dbUser, ability };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
