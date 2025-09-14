import { Hono } from 'hono';
import { db, fulfillmentCenters } from '../db/connection.ts';
import { insertFulfillmentCenterSchema } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.ts';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', authMiddleware('admin'), async (c) => {
  const all = await db.select().from(fulfillmentCenters);
  return c.json(all);
});

app.get('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const [center] = await db.select().from(fulfillmentCenters).where(eq(fulfillmentCenters.id, id));
  if (!center) return c.json({ error: 'Fulfillment center not found' }, 404);
  return c.json(center);
});

app.post('/', authMiddleware('admin'), zValidator('json', insertFulfillmentCenterSchema), async (c) => {
  const data = c.req.valid('json');
  const [center] = await db.insert(fulfillmentCenters).values(data).returning();
  return c.json(center, 201);
});

app.patch('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const data = await c.req.json();
  await db.update(fulfillmentCenters).set(data).where(eq(fulfillmentCenters.id, id));
  return c.json({ message: 'Fulfillment center updated' });
});

app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(fulfillmentCenters).where(eq(fulfillmentCenters.id, id));
  return c.json({ message: 'Fulfillment center deleted' });
});

export default app;
