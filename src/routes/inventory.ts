import { Hono } from 'hono';
import { db, inventory } from '../db/connection.ts';
import { insertInventorySchema } from '../db/schema.ts';
import { products, fulfillmentCenters } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';

const app = new Hono();

app.post('/', authMiddleware('admin'), zValidator('json', insertInventorySchema), async (c) => {
  const data = c.req.valid('json');
  
  const [existing] = await db
    .select()
    .from(inventory)
    .where(and(
      eq(inventory.productId, data.productId),
      eq(inventory.fulfillmentCenterId, data.fulfillmentCenterId)
    ));

  if (existing) {
    const [updated] = await db
      .update(inventory)
      .set({ quantity: data.quantity, updatedAt: new Date() })
      .where(eq(inventory.id, existing.id))
      .returning();
    return c.json(updated);
  }

  const [newInventory] = await db
    .insert(inventory)
    .values(data)
    .returning();
  
  return c.json(newInventory, 201);
});

app.get('/', authMiddleware('admin'), async (c) => {
  const allInventory = await db
    .select({
      id: inventory.id,
      quantity: inventory.quantity,
      productId: inventory.productId,
      productName: products.name,
      fulfillmentCenterId: inventory.fulfillmentCenterId,
      fulfillmentCenterName: fulfillmentCenters.name,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(fulfillmentCenters, eq(inventory.fulfillmentCenterId, fulfillmentCenters.id));
  
  return c.json(allInventory);
});

app.get('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  
  const [inventoryItem] = await db
    .select({
      id: inventory.id,
      quantity: inventory.quantity,
      productId: inventory.productId,
      productName: products.name,
      fulfillmentCenterId: inventory.fulfillmentCenterId,
      fulfillmentCenterName: fulfillmentCenters.name,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    })
    .from(inventory)
    .where(eq(inventory.id, id))
    .leftJoin(products, eq(inventory.productId, products.id))
    .leftJoin(fulfillmentCenters, eq(inventory.fulfillmentCenterId, fulfillmentCenters.id));
  
  if (!inventoryItem) return c.json({ error: 'Inventory item not found' }, 404);
  return c.json(inventoryItem);
});

app.patch('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const { quantity } = await c.req.json();
  
  if (typeof quantity !== 'number') {
    return c.json({ error: 'Quantity must be a number' }, 400);
  }

  const [updated] = await db
    .update(inventory)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(inventory.id, id))
    .returning();
  
  if (!updated) return c.json({ error: 'Inventory item not found' }, 404);
  return c.json(updated);
});

app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  
  const [deleted] = await db
    .delete(inventory)
    .where(eq(inventory.id, id))
    .returning();
  
  if (!deleted) return c.json({ error: 'Inventory item not found' }, 404);
  return c.json({ message: 'Inventory item deleted' });
});

export default app;