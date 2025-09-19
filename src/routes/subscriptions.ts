import { Hono } from 'hono';
import { db, subscriptions } from '../db/connection.ts';
import { subscriptionPlans, users } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.ts';
import { eq, and } from 'drizzle-orm';
import { subscriptionScheduler } from '../jobs/subscriptionScheduler';
import { subscriptionService } from '../services/subscriptionService';

const app = new Hono();

const requireSameUserOrAdmin = async (c: any, next: any) => {
  const user = c.get('user');
  const targetUserId = parseInt(c.req.param('userId'));
  
  if (user.role !== 'admin' && user.userId !== targetUserId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  await next();
};

app.post('/join', authMiddleware('user'), async (c) => {
  const { planId } = await c.req.json();
  const payload = c.get('user');
  try {
    const sub = await subscriptionService.createForUser(payload.userId, planId);
    await subscriptionScheduler.scheduleSubscriptionJob(sub.id);
    return c.json(sub, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.get('/me', authMiddleware('user'), async (c) => {
  const payload = c.get('user');
  const userSubs = await db.select().from(subscriptions).where(eq(subscriptions.userId, payload.userId));
  return c.json(userSubs);
});

app.get('/user/:userId', authMiddleware(), requireSameUserOrAdmin, async (c) => {
  const userId = Number(c.req.param('userId'));
  const userSubs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return c.json(userSubs);
});

app.post('/', authMiddleware('admin'), async (c) => {
  const data = await c.req.json();
  const [sub] = await db.insert(subscriptions).values(data).returning();
  await subscriptionScheduler.scheduleSubscriptionJob(sub.id);
  return c.json(sub, 201);
});

app.get('/', authMiddleware('admin'), async (c) => {
  const allSubs = await db.select().from(subscriptions);
  return c.json(allSubs);
});

app.get('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = c.get('user');
  
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!subscription) return c.json({ error: 'Subscription not found' }, 404);
  
  if (payload.role !== 'admin' && subscription.userId !== payload.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  return c.json(subscription);
});

app.patch('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = c.get('user');
  const data = await c.req.json();
  
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!subscription) return c.json({ error: 'Subscription not found' }, 404);
  
  if (payload.role !== 'admin' && subscription.userId !== payload.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
  if (data.planId || data.nextBillingDate) {
    await subscriptionScheduler.updateSubscriptionSchedule(id);
  }
  return c.json({ message: 'Subscription updated' });
});

app.delete('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = c.get('user');

  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!subscription) return c.json({ error: 'Subscription not found' }, 404);

  if (payload.role === 'user' && subscription.userId !== payload.userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await subscriptionScheduler.unscheduleSubscriptionJob(id);
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  return c.json({ message: 'Subscription deleted' });
});

export default app;