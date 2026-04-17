import { Hono } from 'hono';
import liqpayWebhook from './webhooks/liqpay';
import channelWebhooks from './webhooks/channels';

const app = new Hono().basePath('/api');

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'ruta-platform',
    timestamp: new Date().toISOString()
  });
});

// Webhooks
app.route('/webhooks/liqpay', liqpayWebhook);
// Omnichannel: /api/webhooks/telegram/:inboxId, /email/:inboxId, /echat/:inboxId, /meta
app.route('/webhooks', channelWebhooks);

export default app;
