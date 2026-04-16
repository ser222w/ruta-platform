import { Hono } from 'hono';

const app = new Hono().basePath('/api');

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'ruta-platform',
    timestamp: new Date().toISOString()
  });
});

export default app;
