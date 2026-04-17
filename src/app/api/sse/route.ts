import { type NextRequest } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@/server/auth';

// =============================================================
// SSE ENDPOINT — real-time inbox notifications
// GET /api/sse
//
// Listens to PostgreSQL NOTIFY 'new_message' and streams events to browser.
// Client: EventSource('/api/sse') → invalidate TanStack Query on event
//
// NOTE: Requires Node.js runtime (not Edge) for pg LISTEN support
// =============================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Auth check
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  let clientGone = false;
  req.signal.addEventListener('abort', () => {
    clientGone = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      // Use raw pg connection for LISTEN (Prisma doesn't support it natively)
      // We use $queryRawUnsafe with a polling fallback if pg LISTEN not available
      // For production: use pg client directly
      try {
        await listenForMessages(controller, encoder, () => clientGone);
      } catch (err) {
        console.error('[SSE] Error in listener:', err);
      } finally {
        controller.close();
      }
    },
    cancel() {
      clientGone = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    }
  });
}

// =============================================================
// PostgreSQL LISTEN implementation
// =============================================================

async function listenForMessages(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  isClientGone: () => boolean
): Promise<void> {
  // Polling fallback — checks for new unread conversations every 3s
  // Replace with pg LISTEN in production for true real-time
  let lastCheck = new Date();

  const interval = setInterval(async () => {
    if (isClientGone()) {
      clearInterval(interval);
      return;
    }

    try {
      const newConvs = await db.conversation.findMany({
        where: {
          unreadByManager: true,
          lastMessageAt: { gt: lastCheck }
        },
        select: { id: true, channel: true, inboxId: true },
        take: 10
      });

      if (newConvs.length > 0) {
        lastCheck = new Date();

        for (const conv of newConvs) {
          const data = JSON.stringify({
            type: 'new_message',
            conversationId: conv.id,
            channel: conv.channel,
            inboxId: conv.inboxId
          });
          controller.enqueue(encoder.encode(`event: new_message\ndata: ${data}\n\n`));
        }
      }

      // Heartbeat every 30s to keep connection alive
      const now = Date.now();
      if (now % 30000 < 3000) {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${now}\n\n`));
      }
    } catch (err) {
      // DB error — close stream, client will reconnect
      clearInterval(interval);
      controller.close();
    }
  }, 3000);

  // Keep alive until client disconnects
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (isClientGone()) {
        clearInterval(interval);
        clearInterval(check);
        resolve();
      }
    }, 1000);
  });
}
