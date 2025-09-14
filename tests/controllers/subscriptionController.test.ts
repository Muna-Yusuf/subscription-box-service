import { describe, it, expect, beforeEach } from 'bun:test';
import { subscriptionController } from '../../src/controllers/subscriptionController';
import { db } from '../../src/db/connection';
import { users, subscriptionPlans, subscriptions } from '../../src/db/schema';

describe('Subscription Controller', () => {
  beforeEach(async () => {
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(users);
  });

  describe('GET /subscriptions', () => {
    it('should return subscriptions for admin', async () => {
      // Create test data first
      const [user] = await db.insert(users).values({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hash',
      }).returning();

      const [plan] = await db.insert(subscriptionPlans).values({
        name: 'Monthly Plan',
        billingCycle: 'monthly',
        price: 2999,
      }).returning();

      await db.insert(subscriptions).values({
        userId: user.id,
        planId: plan.id,
        startDate: new Date().toISOString().split('T')[0],
        nextBillingDate: new Date().toISOString().split('T')[0],
        status: 'active',
      });

      const req = new Request('http://localhost/subscriptions', {
        headers: { 'x-user-id': '1', 'x-admin': 'true' },
      });
      const res = await subscriptionController.request(req);

      expect(res.status).toBe(200);
      const response = await res.json();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});