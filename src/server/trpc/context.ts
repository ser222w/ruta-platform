import { auth } from '@/server/auth';

export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: opts.headers });
  return { session };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
