import { describe, it, expect, beforeEach } from 'bun:test';
import { orderService } from '../../src/services/orderService';
import { db } from '../../src/db/connection';
import { users, subscriptionPlans, subscriptions, products, fulfillmentCenters, inventory } from '../../src/db/schema';

describe('Order Service', () => {
  beforeEach(async () => {
    await db.delete(inventory);
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(products);
    await db.delete(fulfillmentCenters);
    await db.delete(users);
  });

  it('should handle order processing for non-existent subscription', async () => {
    await expect(orderService.processSubscriptionOrder(9999))
      .rejects
      .toThrow('Subscription not found or not active');
  });

  it('should handle order processing with missing product', async () => {
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

    // Should fail because no product/inventory exists
    await expect(orderService.processSubscriptionOrder(subscription.id))
      .rejects
      .toThrow();
  });
});