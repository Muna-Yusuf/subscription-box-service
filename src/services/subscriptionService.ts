import { db } from '../db/connection.ts';
import { subscriptions, subscriptionPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

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
        startDate: new Date(),
        nextBillingDate: this.calculateNextBillingDate(new Date(), plan.billingCycle),
        status: 'active',
      })
      .returning();

    return subscription;
  }

  async getAll(userId?: number) {
    if (userId) {
      return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    } else {
      return await db.select().from(subscriptions);
    }
  }

  async updateStatus(subscriptionId: number, status: 'paused' | 'active' | 'payment_failed') {
    const [updated] = await db
      .update(subscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return updated;
  }

  private calculateNextBillingDate(currentDate: Date, cycle: 'monthly' | 'quarterly' | 'annually') {
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
    }
    return next;
  }
}

export const subscriptionService = new SubscriptionService();