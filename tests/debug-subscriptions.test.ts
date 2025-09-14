import { describe, it, expect, beforeEach } from 'bun:test';
import app from '../src/index';
import { db } from '../src/db/connection';
import { users } from '../src/db/schema';

describe('Debug Subscriptions Routes', () => {
  let authToken: string;

  beforeEach(async () => {
    await db.delete(users);

    // Create test user and get auth token
    const [user] = await db.insert(users).values({
      email: 'test124@example.com',
      firstName: 'Test124',
      lastName: 'User124',
      passwordHash: 'hash',
      role: 'user',
    }).returning();

    const { generateToken } = await import('../src/middleware/auth');
    authToken = generateToken({ userId: user.id, role: user.role });
  });

  it('should debug the /me endpoint', async () => {
    console.log('Testing /api/subscriptions/me with user role...');
    
    const res = await app.request('/api/subscriptions/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    console.log('Response status:', res.status);
    console.log('Response body:', await res.text());
    
    // Just log the result for debugging
    expect(res.status).not.toBe(403); // Should not be forbidden for users
  });
});