import { pollEmailInboxes } from './imap-poll';

// =============================================================
// IMAP POLLER — starts on server boot via instrumentation.ts
// Polls every 2 minutes. Single instance guard via globalThis.
// =============================================================

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

declare global {
  // eslint-disable-next-line no-var
  var __imapPollerStarted: boolean | undefined;
}

export function startImapPoller(): void {
  // Prevent duplicate intervals on hot reload / multiple worker init
  if (globalThis.__imapPollerStarted) return;
  globalThis.__imapPollerStarted = true;

  console.log('[imap-poller] Starting Gmail IMAP polling every 2 min');

  // Initial poll after 30s (let server fully boot first)
  setTimeout(() => {
    runPoll();
    setInterval(runPoll, POLL_INTERVAL_MS);
  }, 30_000);
}

async function runPoll(): Promise<void> {
  try {
    await pollEmailInboxes();
  } catch (err) {
    console.error('[imap-poller] Poll error:', err);
  }
}
