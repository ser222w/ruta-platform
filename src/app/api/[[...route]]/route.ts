import app from '@/server/hono/app';
import { handle } from 'hono/vercel';

// Note: tRPC is handled at /api/trpc/[trpc] — Hono handles all other /api/* routes
export const GET = handle(app);
export const POST = handle(app);
