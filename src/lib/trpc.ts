'use client';

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/root';

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClientInstance() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc'
      })
    ]
  });
}
