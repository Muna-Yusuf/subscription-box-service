import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import api from './routes/router';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());
app.use('*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path}`);
  await next();
});

app.route('/api', api);

app.get('/', (c) => {
  return c.text('Subscription Box Service API');
});

app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '3000');
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
