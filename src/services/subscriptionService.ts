import { db } from '../db/connection.ts';
import { subscriptions, subscriptionPlans, users } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { schedulerService } from './schedulerService.ts';

export class SubscriptionService {
  async createForUser(userId: number, planId: number) {
    // Verify user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    // Verify plan exists
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));

    if (!plan) {
      throw new Error('Plan not found');
    }

    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.planId, planId),
          eq(subscriptions.status, 'active')
        )
      );

    if (existingSubscription.length > 0) {
      throw new Error('User already has an active subscription for this plan');
    }

    const nextBillingDate = this.calculateNextBillingDate(new Date(), plan.billingCycle);

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        startDate: this.formatDateForDB(new Date()),
        nextBillingDate: this.formatDateForDB(nextBillingDate),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!subscription) {
      throw new Error('Failed to create subscription');
    }

    // Schedule the first billing
    await schedulerService.scheduleNextBilling(subscription.id, new Date(subscription.nextBillingDate));

    return subscription;
  }

  async getAll(userId?: number) {
    if (userId) {
      return await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(subscriptions.createdAt);
    } else {
      return await db
        .select()
        .from(subscriptions)
        .orderBy(subscriptions.createdAt);
    }
  }

  async getById(subscriptionId: number) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  }

  async getUserSubscriptions(userId: number) {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(subscriptions.createdAt);
  }

  async updateStatus(subscriptionId: number, status: 'active' | 'paused' | 'cancelled' | 'payment_failed') {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const [updated] = await db
      .update(subscriptions)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update subscription status');
    }

    if (status === 'active') {
      await schedulerService.scheduleNextBilling(subscriptionId, new Date(updated.nextBillingDate));
    } else if (status === 'cancelled' || status === 'paused') {
      await schedulerService.unscheduleSubscription(subscriptionId);
    }

    return updated;
  }

  async updateNextBillingDate(subscriptionId: number, nextBillingDate: Date) {
    const [updated] = await db
      .update(subscriptions)
      .set({ 
        nextBillingDate: this.formatDateForDB(nextBillingDate),
        updatedAt: new Date() 
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update next billing date');
    }

    // Reschedule the billing job
    await schedulerService.scheduleNextBilling(subscriptionId, nextBillingDate);

    return updated;
  }

  async cancel(subscriptionId: number) {
    const result = await this.updateStatus(subscriptionId, 'cancelled');
    await schedulerService.unscheduleSubscription(subscriptionId);
    return result;
  }

  async pause(subscriptionId: number) {
    const result = await this.updateStatus(subscriptionId, 'paused');
    await schedulerService.unscheduleSubscription(subscriptionId);
    return result;
  }

  async resume(subscriptionId: number) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Calculate new next billing date from now
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, subscription.planId));

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const nextBillingDate = this.calculateNextBillingDate(new Date(), plan.billingCycle);

    const [updated] = await db
      .update(subscriptions)
      .set({ 
        status: 'active',
        nextBillingDate: this.formatDateForDB(nextBillingDate),
        updatedAt: new Date() 
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    if (!updated) {
      throw new Error('Failed to resume subscription');
    }

    await schedulerService.scheduleNextBilling(subscriptionId, nextBillingDate);

    return updated;
  }

  async markPaymentFailed(subscriptionId: number) {
    return this.updateStatus(subscriptionId, 'payment_failed');
  }

  private calculateNextBillingDate(currentDate: Date, cycle: 'monthly' | 'quarterly' | 'annually'): Date {
    const next = new Date(currentDate);
    switch (cycle) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'annually':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unknown billing cycle: ${cycle}`);
    }
    return next;
  }

  private formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export const subscriptionService = new SubscriptionService();