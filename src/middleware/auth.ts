import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables');
  throw new Error('JWT_SECRET is not defined');
}

console.log('JWT Middleware initialized with secret:', SECRET ? '***' : 'undefined');

export interface TokenPayload {
  userId: number;
  role: 'admin' | 'user';
}

export const getUserFromToken = (token: string): TokenPayload | null => {
  try {
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, SECRET) as TokenPayload;
    console.log('Token verification successful:', decoded);
    return decoded;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      expiredAt: error.expiredAt,
      date: new Date().toISOString()
    });
    return null;
  }
};

export const generateToken = (payload: TokenPayload): string => {
  console.log('Generating token for payload:', payload);
  const token = jwt.sign(payload, SECRET, { expiresIn: '2d' });
  console.log('Token generated:', token.substring(0, 20) + '...');
  return token;
};

export const verifyToken = (token: string): TokenPayload | null => {
  return getUserFromToken(token);
};

export const authMiddleware = (role?: 'admin' | 'user') => {
  return async (c: any, next: any) => {
    console.log('\n=== AUTH MIDDLEWARE CALLED ===');
    console.log('Request path:', c.req.path);
    console.log('Request method:', c.req.method);
    
    const header = 
      c.req.header('Authorization') ||
      c.req.header('authorization') ||
      c.req.headers?.get?.('Authorization') ||
      c.req.headers?.get?.('authorization');

    console.log('Authorization header:', header);

    if (!header) {
      console.log('❌ No authorization header found');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!header.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization format. Expected: Bearer <token>');
      return c.json({ error: 'Invalid authorization format' }, 401);
    }

    const token = header.replace('Bearer ', '').trim();
    console.log('Extracted token:', token.substring(0, 20) + '...');
    console.log('JWT_SECRET available:', !!SECRET);
    console.log('Expected role:', role || 'any');

    try {
      const payload = verifyToken(token);
      
      if (!payload) {
        console.log('❌ Token verification returned null');
        return c.json({ error: 'Invalid token' }, 401);
      }

      console.log('✅ Token payload:', payload);

      if (role && payload.role !== role) {
        console.log(`❌ Role mismatch: expected ${role}, got ${payload.role}`);
        return c.json({ error: 'Forbidden' }, 403);
      }

      c.set('user', payload);
      console.log('✅ Authentication successful');
      
      await next();
      
    } catch (error: any) {
      console.log('❌ Unexpected error in auth middleware:', error.message);
      return c.json({ error: 'Authentication error' }, 500);
    }
  };
};

export const debugToken = (token: string) => {
  console.log('\n=== DEBUGGING TOKEN ===');
  console.log('Token:', token);
  console.log('Secret available:', !!SECRET);
  
  try {
    const decoded = jwt.decode(token);
    console.log('Decoded (without verification):', decoded);
    
    const verified = jwt.verify(token, SECRET);
    console.log('Verified:', verified);
    
    return { decoded, verified, valid: true };
  } catch (error: any) {
    console.log('Error:', error.message);
    return { error: error.message, valid: false };
  }
};