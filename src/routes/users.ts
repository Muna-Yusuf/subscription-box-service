import { Hono } from 'hono';
import { db, users } from '../db/connection.ts';
import { insertUserSchema } from '../db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { generateToken, authMiddleware } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';


const app = new Hono();

app.get('/debug/auth', async (c) => {
  const header = c.req.header('Authorization');
  const token = header?.replace('Bearer ', '').trim();
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 400);
  }

  try {
    const { verifyToken } = await import('../middleware/auth');
    const payload = verifyToken(token);
    
    return c.json({
      token: token.substring(0, 20) + '...',
      payload,
      valid: !!payload,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ error: 'Debug failed' }, 500);
  }
});


app.post('/', zValidator('json', insertUserSchema), async (c) => {
  const data = c.req.valid('json');

  try {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(data.passwordHash, 10);

    const [user] = await db.insert(users).values({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: hashedPassword, // Store hashed password
      role: 'user',
    }).returning();

    const token = generateToken({ userId: user.id, role: user.role });
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword, token }, 201);
  } catch (err: any) {
    if (err.code === '23505') return c.json({ error: 'Email already exists' }, 409);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // PROPER PASSWORD CHECK with bcrypt
    if (!user.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = generateToken({ userId: user.id, role: user.role });
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.get('/me', authMiddleware('user'), async (c) => {
  try {
    const payload = c.get('user');
    if (!payload) return c.json({ error: 'Unauthorized' }, 401);

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json(user);
  } catch (err: any) {
    console.error('Error fetching user:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});


app.patch('/:id', authMiddleware(), async (c) => {
  const id = Number(c.req.param('id'));
  const payload = c.get('user');
  if (payload.role === 'user' && payload.userId !== id) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const data = await c.req.json();
  await db.update(users).set(data).where(eq(users.id, id));
  return c.json({ message: 'User updated' });
});

app.delete('/:id', authMiddleware('admin'), async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ message: 'User deleted' });
});

export default app;