import { Hono } from 'hono';
import { db, subscriptions } from '../db/connection.ts';
import { insertSubscriptionSchema } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.ts';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.post('/', authMiddleware('admin'), zValidator('json', insertSubscriptionSchema), async (c) => {
  const data = c.req.valid('json');
  const [sub] = await db.insert(subscriptions).values(data).returning();
  return c.json(sub, 201);
});

app.get('/', authMiddleware('admin'), async (c) => {
  const allSubs = await db.select().from(subscriptions);
  return c.json(allSubs);
});


app.get('/me', authMiddleware('user'), async (c) => {
  const payload = c.env.user;
  const userSubs = await db.select().from(subscriptions).where(eq(subscriptions.userId, payload.userId));
  return c.json(userSubs);
});

export default app;
