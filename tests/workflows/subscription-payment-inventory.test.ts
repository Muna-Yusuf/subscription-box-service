import { describe, it, expect, beforeEach } from 'bun:test';
import { orderService } from '../../src/services/orderService';
import { db } from '../../src/db/connection';
import { users, subscriptionPlans, subscriptions } from '../../src/db/schema';

describe('Subscription Workflow', () => {
  beforeEach(async () => {
    // Clear tables in correct order
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(users);
  });

  it('should handle basic workflow errors', async () => {
    await expect(orderService.processSubscriptionOrder(9999))
      .rejects
      .toThrow('Subscription not found or not active');
  });

  it('should handle payment processing errors', async () => {
    // Create test data
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

    const [subscription] = await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: new Date().toISOString().split('T')[0],
      status: 'active',
    }).returning();

    // This will test error handling in the workflow
    // The order should fail due to missing product/inventory
    await expect(orderService.processSubscriptionOrder(subscription.id))
      .rejects
      .toThrow();
  });
});