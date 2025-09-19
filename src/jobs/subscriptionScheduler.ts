import { Queue } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from '../config/redis';
import { db } from '../db/connection.ts';
import { subscriptions, subscriptionPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export class SubscriptionScheduler {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.SUBSCRIPTIONS, { connection: redisConnection });
  }

  async scheduleSubscriptionJob(subscriptionId: number) {
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        startDate: subscriptions.startDate,
        nextBillingDate: subscriptions.nextBillingDate,
        plan: {
          billingCycle: subscriptionPlans.billingCycle,
        },
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id));

    if (!subscription) throw new Error(`Subscription ${subscriptionId} not found`);

    if (!subscription.plan) {
      throw new Error(`Subscription plan for subscription ${subscriptionId} not found`);
    }
    const pattern = this.getCronPattern(
      subscription.plan.billingCycle,
      new Date(subscription.nextBillingDate)
    );

    await this.queue.add(
      'process-subscription',
      { subscriptionId },
      {
        jobId: `subscription-${subscriptionId}`,
        repeat: { pattern, startDate: subscription.nextBillingDate },
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      }
    );
  }

  private getCronPattern(billingCycle: string, nextDate: Date): string {
    const date = new Date(nextDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    switch (billingCycle) {
      case 'monthly':
        return `0 0 ${day} * *`;
      case 'quarterly':
        return `0 0 ${day} */3 *`;
      case 'annually':
        return `0 0 ${day} ${month} *`;
      default:
        throw new Error(`Unknown billing cycle: ${billingCycle}`);
    }
  }

  async unscheduleSubscriptionJob(subscriptionId: number) {
    const jobs = await this.queue.getRepeatableJobs();
    const jobToRemove = jobs.find((j) => j.id === `subscription-${subscriptionId}`);
    if (jobToRemove) await this.queue.removeRepeatableByKey(jobToRemove.key);
  }

  async updateSubscriptionSchedule(subscriptionId: number) {
    await this.unscheduleSubscriptionJob(subscriptionId);
    await this.scheduleSubscriptionJob(subscriptionId);
  }
}

// Always export a real object for API routes
export const subscriptionScheduler = new SubscriptionScheduler();

// Export QUEUE_NAMES from here as well for backward compatibility
export { QUEUE_NAMES } from '../config/redis';