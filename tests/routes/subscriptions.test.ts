import { describe, it, expect, beforeEach } from 'bun:test';
import app from '../../src/index';
import { db } from '../../src/db/connection';
import { users, subscriptionPlans, subscriptions } from '../../src/db/schema';

describe('Subscriptions Routes', () => {
  let authToken: string;

  beforeEach(async () => {
    // Clear tables in correct order to avoid foreign key constraints
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(users);

    // Create test user and get auth token
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hash',
      role: 'user',
    }).returning();

    // Generate token manually for testing
    const { generateToken } = await import('../../src/middleware/auth');
    authToken = generateToken({ userId: user.id, role: user.role });
  });

  it('should return 400 for invalid subscription creation', async () => {
    const res = await app.request('/api/subscriptions/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({}), // Empty body should cause 400
    });

    expect(res.status).toBe(400);
  });

  it('should get user subscriptions via GET /api/subscriptions/me', async () => {
    // First create a subscription plan
    const [plan] = await db.insert(subscriptionPlans).values({
      name: 'Test Plan',
      billingCycle: 'monthly',
      price: 2999,
    }).returning();

    // Get user ID from token
    const { verifyToken } = await import('../../src/middleware/auth');
    const payload = verifyToken(authToken);
    
    // Create a subscription for the user
    await db.insert(subscriptions).values({
      userId: payload!.userId,
      planId: plan.id,
      startDate: new Date().toISOString().split('T')[0], // Date only
      nextBillingDate: new Date().toISOString().split('T')[0], // Date only
      status: 'active',
    });

    const res = await app.request('/api/subscriptions/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(res.status).toBe(200);
    const userSubscriptions = await res.json();
    expect(Array.isArray(userSubscriptions)).toBe(true);
  });
});