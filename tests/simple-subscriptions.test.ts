import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { authMiddleware } from '../src/middleware/auth';

// Create a simple test app without BullMQ dependencies
const testApp = new Hono();

testApp.get('/test-me', authMiddleware('user'), async (c) => {
  return c.json({ message: 'This should work for users' });
});

testApp.get('/test-admin', authMiddleware('admin'), async (c) => {
  return c.json({ message: 'This should work for admins' });
});

describe('Simple Auth Test', () => {
  it('should work for user role', async () => {
    const { generateToken } = await import('../src/middleware/auth');
    const userToken = generateToken({ userId: 1, role: 'user' });
    
    const res = await testApp.request('/test-me', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });
    
    expect(res.status).toBe(200);
  });

  it('should fail for user role accessing admin endpoint', async () => {
    const { generateToken } = await import('../src/middleware/auth');
    const userToken = generateToken({ userId: 1, role: 'user' });
    
    const res = await testApp.request('/test-admin', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });
    
    expect(res.status).toBe(403);
  });
});