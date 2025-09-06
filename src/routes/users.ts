import { Hono } from 'hono';
import { db, users } from '../db/connection';
import { insertUserSchema } from '../db/schema';
import { zValidator } from '@hono/zod-validator';
import { generateToken, authMiddleware } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Create a new user and return token
app.post('/', zValidator('json', insertUserSchema), async (c) => {
  const data = c.req.valid('json');

  try {
    const [user] = await db.insert(users).values({
      ...data,
      role: 'user',
    }).returning();

    const token = generateToken({ userId: user.id, role: user.role });

    return c.json({ user, token }, 201);
  } catch (err: any) {
    if (err.code === '23505') return c.json({ error: 'Email already exists' }, 409);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all users (admin only)
app.get('/', authMiddleware('admin'), async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

// Get current user info
// Get current user info
app.get('/me', authMiddleware('user'), async (c) => {
  try {
    const payload = c.ctx.user;
    if (!payload) return c.json({ error: 'Unauthorized' }, 401);

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json(user);
  } catch (err: any) {
    console.error('Error fetching user:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});


// Update a user
app.patch('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = c.ctx.user; // <-- use c.ctx.user

  if (payload.role === 'user' && payload.userId !== id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const data = await c.req.json();
  await db.update(users).set(data).where(eq(users.id, id));
  return c.json({ message: 'User updated' });
});

// Delete a user (admin only)
app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ message: 'User deleted' });
});

export default app;