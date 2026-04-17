import { EventEmitter } from 'events';

// ─────────────────────────────────────────────
// App Event Types
// ─────────────────────────────────────────────

export interface IncomingCallPayload {
  callId: string;
  callerPhone: string;
  callerName?: string;
  guestId?: string;
  guestLtv?: number;
  guestStayCount?: number;
  guestLastProperty?: string;
  guestLastStay?: string;
  inquiryId: string;
  managerId?: string;
}

export interface CallEndedPayload {
  callId: string;
  externalId: string;
  duration: number;
  inquiryId?: string;
}

export type AppEventType = 'INCOMING_CALL' | 'CALL_ENDED' | 'CALL_MISSED';

export interface AppEvent {
  type: AppEventType;
  payload: IncomingCallPayload | CallEndedPayload;
}

// ─────────────────────────────────────────────
// Singleton EventEmitter
// ─────────────────────────────────────────────

// Global singleton across all Next.js requests in same process
const globalForEvents = globalThis as unknown as {
  appEventEmitter: EventEmitter | undefined;
};

export const appEvents: EventEmitter = globalForEvents.appEventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.appEventEmitter = appEvents;
}

appEvents.setMaxListeners(100);

// ─────────────────────────────────────────────
// Push event to specific user
// ─────────────────────────────────────────────

export function pushToUser(userId: string, event: AppEvent): void {
  appEvents.emit(`user:${userId}`, event);
}

// Push to all connected users (broadcast)
export function pushToAll(event: AppEvent): void {
  appEvents.emit('broadcast', event);
}
