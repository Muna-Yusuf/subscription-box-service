import { describe, it, expect, beforeEach } from 'bun:test';
import { subscriptionService } from '../../src/services/subscriptionService';
import { db } from '../../src/db/connection';
import { users, subscriptionPlans, subscriptions } from '../../src/db/schema';

export class SubscriptionService {
  async createForUser(userId: number, planId: number) {
    const [plan] = await db
      .select({
        id: subscriptionPlans.id,
        billingCycle: subscriptionPlans.billingCycle,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));

    if (!plan) throw new Error('Plan not found');

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        startDate: new Date().toISOString().split('T')[0], // Fix date serialization
        nextBillingDate: this.calculateNextBillingDate(new Date(), plan.billingCycle).toISOString().split('T')[0], // Fix date serialization
        status: 'active',
      })
      .returning();

    return subscription;
  }


describe('Subscription Service', () => {
  beforeEach(async () => {
    // Clear tables in correct order
    await db.delete(subscriptions);
    await db.delete(subscriptionPlans);
    await db.delete(users);
  });

  it('should create subscription for user', async () => {
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

    // Test the service
    const subscription = await subscriptionService.createForUser(user.id, plan.id);

    expect(subscription).toBeDefined();
    expect(subscription.userId).toBe(user.id);
    expect(subscription.planId).toBe(plan.id);
    expect(subscription.status).toBe('active');
  });

  it('should throw error for non-existent plan', async () => {
    const [user] = await db.insert(users).values({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hash',
    }).returning();

    await expect(subscriptionService.createForUser(user.id, 999))
      .rejects
      .toThrow('Plan not found');
  });

  it('should get all subscriptions', async () => {
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

    // Use the actual subscriptions table from the import
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: plan.id,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: new Date().toISOString().split('T')[0],
      status: 'active',
    });

    const allSubscriptions = await subscriptionService.getAll();
    expect(Array.isArray(allSubscriptions)).toBe(true);
  });
});