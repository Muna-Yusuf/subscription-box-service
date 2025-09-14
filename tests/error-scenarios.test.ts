import { describe, it, expect, beforeEach } from 'bun:test';
import { orderService } from '../src/services/orderService';
import { db } from '../src/db/connection';
import { users, subscriptionPlans, subscriptions, products, fulfillmentCenters, inventory } from '../src/db/schema';

describe('Error Scenarios', () => {
  beforeEach(async () => {
    await db.delete(inventory);
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(products);
    await db.delete(fulfillmentCenters);
    await db.delete(users);
  });

  it('should handle non-existent subscription', async () => {
    await expect(orderService.processSubscriptionOrder(9999))
      .rejects
      .toThrow('Subscription not found or not active');
  });

  it('should handle inventory service errors', async () => {
    // Create test data with proper date formatting
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
      startDate: new Date().toISOString().split('T')[0], // Date string only
      nextBillingDate: new Date().toISOString().split('T')[0], // Date string only
      status: 'active',
    }).returning();

    // This should fail due to missing product/inventory, testing error handling
    await expect(orderService.processSubscriptionOrder(subscription.id))
      .rejects
      .toThrow();
  });
});