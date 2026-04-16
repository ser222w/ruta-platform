import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Базова перевірка авторизації — сесія є
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// Повна перевірка — сесія + CASL ability (для більшості features)
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user || !ctx.ability) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, session: ctx.session, user: ctx.user, ability: ctx.ability } });
});
