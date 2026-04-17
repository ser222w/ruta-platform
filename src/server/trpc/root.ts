import { router } from './trpc';
import { healthRouter } from './routers/health';
import { crmRouter } from './routers/crm';
import { inquiryRouter } from './routers/inquiry';
import { bookingRouter } from './routers/booking';
import { taskRouter } from './routers/task';

export const appRouter = router({
  health: healthRouter,
  crm: crmRouter,
  inquiry: inquiryRouter,
  booking: bookingRouter,
  task: taskRouter
});

export type AppRouter = typeof appRouter;
