'use client';

import { useAppEvents } from '@/lib/hooks/use-app-events';
import { IncomingCallPopup } from '@/components/shared/incoming-call-popup';

/**
 * AppEventsProvider — client component, монтується в dashboard layout.
 * Підключається до SSE, слухає події, показує screen pop.
 */
export function AppEventsProvider() {
  useAppEvents();
  return <IncomingCallPopup />;
}
