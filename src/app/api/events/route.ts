import { auth } from '@/server/auth';
import { appEvents } from '@/server/events';
import type { AppEvent } from '@/server/events';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/events
 *
 * Server-Sent Events endpoint для real-time нотифікацій менеджерів.
 * Клієнт підключається при login, тримає з'єднання відкритим.
 * Сервер пушить події через global EventEmitter singleton.
 *
 * Events:
 *   INCOMING_CALL  — вхідний дзвінок, показати screen pop
 *   CALL_ENDED     — дзвінок завершено
 */
export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // Encoder для текстових SSE фреймів
  const encoder = new TextEncoder();

  // AbortSignal для cleanup при disconnect
  const { signal } = request;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: AppEvent) {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Клієнт від'єднався
          cleanup();
        }
      }

      // Heartbeat кожні 25 секунд щоб тримати з'єднання живим
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 25_000);

      // Subscribe на події для цього userId
      appEvents.on(`user:${userId}`, send);

      // Cleanup при disconnect
      function cleanup() {
        clearInterval(heartbeatInterval);
        appEvents.off(`user:${userId}`, send);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      // Слухаємо AbortSignal
      signal.addEventListener('abort', cleanup, { once: true });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no' // вимикає буферизацію в nginx
    }
  });
}
