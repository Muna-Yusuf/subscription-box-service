import { Hono } from 'hono';
import { db, orders } from '../db/connection.ts';
import { subscriptions, products, fulfillmentCenters, users } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { eq, desc, and } from 'drizzle-orm';
import { orderService } from '../services/orderService';

const app = new Hono();
app.post('/', authMiddleware('admin'), async (c) => {
  const data = await c.req.json();
  const [newOrder] = await db.insert(orders).values(data).returning();
  return c.json(newOrder, 201);
});

app.get('/', authMiddleware('admin'), async (c) => {
  const allOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      orderDate: orders.orderDate,
      createdAt: orders.createdAt,
      subscriptionId: orders.subscriptionId,
      productId: orders.productId,
      productName: products.name,
      productPrice: products.price,
      fulfillmentCenterId: orders.fulfillmentCenterId,
      fulfillmentCenterName: fulfillmentCenters.name,
      userId: users.id,
      userName: users.firstName,
    })
    .from(orders)
    .leftJoin(subscriptions, eq(orders.subscriptionId, subscriptions.id))
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(fulfillmentCenters, eq(orders.fulfillmentCenterId, fulfillmentCenters.id))
    .orderBy(desc(orders.createdAt));

  return c.json(allOrders);
});

app.get('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      orderDate: orders.orderDate,
      subscriptionId: orders.subscriptionId,
      productId: orders.productId,
      productName: products.name,
      productDescription: products.description,
      productPrice: products.price,
      fulfillmentCenterId: orders.fulfillmentCenterId,
      fulfillmentCenterName: fulfillmentCenters.name,
      fulfillmentCenterAddress: fulfillmentCenters.address,
      userId: users.id,
      userEmail: users.email,
      userName: users.firstName,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .leftJoin(subscriptions, eq(orders.subscriptionId, subscriptions.id))
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(fulfillmentCenters, eq(orders.fulfillmentCenterId, fulfillmentCenters.id));

  if (!order) return c.json({ error: 'Order not found' }, 404);
  return c.json(order);
});

app.patch('/:id/status', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const { status } = await c.req.json();
  if (!status || typeof status !== 'string') return c.json({ error: 'Valid status required' }, 400);

  const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
  if (!updated) return c.json({ error: 'Order not found' }, 404);
  return c.json(updated);
});

app.get('/me', authMiddleware('user'), async (c) => {
  const payload = c.get('user');
  const userOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      orderDate: orders.orderDate,
      productName: products.name,
      productPrice: products.price,
      fulfillmentCenterName: fulfillmentCenters.name,
    })
    .from(orders)
    .leftJoin(subscriptions, eq(orders.subscriptionId, subscriptions.id))
    .leftJoin(products, eq(orders.productId, products.id))
    .leftJoin(fulfillmentCenters, eq(orders.fulfillmentCenterId, fulfillmentCenters.id))
    .where(eq(subscriptions.userId, payload.userId))
    .orderBy(desc(orders.createdAt));

  return c.json(userOrders);
});

app.post('/me', authMiddleware('user'), async (c) => {
  const { subscriptionId, productId } = await c.req.json();
  const payload = c.get('user');

  try {
    const order = await orderService.createUserOrder(payload.userId, subscriptionId, productId);
    return c.json(order, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const [deleted] = await db.delete(orders).where(eq(orders.id, id)).returning();
  if (!deleted) return c.json({ error: 'Order not found' }, 404);
  return c.json({ message: 'Order deleted' });
});

export default app;