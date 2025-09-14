import { Hono } from 'hono';
import { db, products } from '../db/connection.ts';
import { insertProductSchema } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.ts';
import { eq } from 'drizzle-orm';

const app = new Hono();


app.get('/', async (c) => {
  const allProducts = await db.select().from(products);
  return c.json(allProducts);
});

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return c.json({ error: 'Product not found' }, 404);
  return c.json(product);
});

app.post('/', authMiddleware('admin'), zValidator('json', insertProductSchema), async (c) => {
  const data = c.req.valid('json');
  const [product] = await db.insert(products).values(data).returning();
  return c.json(product, 201);
});

app.patch('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  const data = await c.req.json();
  await db.update(products).set(data).where(eq(products.id, id));
  return c.json({ message: 'Product updated' });
});

app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(products).where(eq(products.id, id));
  return c.json({ message: 'Product deleted' });
});

export default app;
