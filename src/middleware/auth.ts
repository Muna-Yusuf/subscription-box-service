import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET is not defined');

export interface TokenPayload {
  userId: number;
  role: 'admin' | 'user';
}

export const getUserFromToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
};

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: '2d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  return getUserFromToken(token);
};

export const authMiddleware = (role?: 'admin' | 'user') => {
  return async (c: any, next: any) => {
    const header =
      c.req?.headers?.get?.('Authorization') ||
      c.request?.headers?.get?.('authorization');

    if (!header) return c.json({ error: 'Unauthorized' }, 401);

    const token = header.replace('Bearer ', '').trim();
    const payload = verifyToken(token);

    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    if (role && payload.role !== role) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    c.ctx.user = payload;

    await next();
  };
};