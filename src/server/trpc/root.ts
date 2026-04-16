import { router } from './trpc';
import { healthRouter } from './routers/health';
import { crmRouter } from './routers/crm';

export const appRouter = router({
  health: healthRouter,
  crm: crmRouter
});

export type AppRouter = typeof appRouter;
