'use client';

import { useEffect } from 'react';
import { useCallStore } from '@/lib/stores/call-store';
import type { IncomingCallData } from '@/lib/stores/call-store';

interface AppEvent {
  type: 'INCOMING_CALL' | 'CALL_ENDED' | 'CALL_MISSED';
  payload: unknown;
}

/**
 * useAppEvents — підключається до SSE endpoint /api/events
 * і обробляє real-time події від сервера.
 *
 * Монтується один раз в dashboard layout.
 */
export function useAppEvents() {
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const dismissCall = useCallStore((s) => s.dismissCall);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('message', (e: MessageEvent<string>) => {
        try {
          const event = JSON.parse(e.data) as AppEvent;

          if (event.type === 'INCOMING_CALL') {
            setActiveCall(event.payload as IncomingCallData);
          }

          if (event.type === 'CALL_ENDED' || event.type === 'CALL_MISSED') {
            setTimeout(() => dismissCall(), 5_000);
          }
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.addEventListener('error', () => {
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 5_000);
      });
    }

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [setActiveCall, dismissCall]);
}
