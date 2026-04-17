import { Hono } from 'hono';
import liqpayWebhook from './webhooks/liqpay';

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

export default app;
