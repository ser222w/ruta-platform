import { router } from './trpc';
import { healthRouter } from './routers/health';
import { crmRouter } from './routers/crm';
import { inquiryRouter } from './routers/inquiry';
import { bookingRouter } from './routers/booking';
import { taskRouter } from './routers/task';
import { inboxRouter } from './routers/inbox';
import { dashboardRouter } from './routers/dashboard';
import { propertyRouter } from './routers/property';

export const appRouter = router({
  health: healthRouter,
  crm: crmRouter,
  inquiry: inquiryRouter,
  booking: bookingRouter,
  task: taskRouter,
  inbox: inboxRouter,
  dashboard: dashboardRouter,
  property: propertyRouter
});

export type AppRouter = typeof appRouter;
