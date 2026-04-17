'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';

// =============================================================
// SSE HOOK — subscribes to /api/sse and invalidates TanStack Query
// on new_message events so the conversation list refreshes in real-time
// =============================================================

export function useInboxSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource('/api/sse');

    es.addEventListener('new_message', (event) => {
      try {
        const data = JSON.parse(event.data) as {
          conversationId: string;
          channel: string;
          inboxId: string;
        };

        // Invalidate conversation list (all filters)
        queryClient.invalidateQueries({ queryKey: [['inbox', 'listConversations']] });

        // Invalidate specific conversation if open
        queryClient.invalidateQueries({
          queryKey: [['inbox', 'getMessages'], { input: { conversationId: data.conversationId } }]
        });

        // Invalidate counts badge
        queryClient.invalidateQueries({ queryKey: [['inbox', 'getCounts']] });
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('error', () => {
      // EventSource auto-reconnects on error — no action needed
    });

    return () => {
      es.close();
    };
  }, [queryClient]);
}
