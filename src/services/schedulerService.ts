import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.ts';
import { orderService } from './orderService.ts';

const redisConnection = getRedisConnection();

export const QUEUE_NAMES = { SUBSCRIPTIONS: 'subscriptions' };

export const subscriptionQueue = new Queue(QUEUE_NAMES.SUBSCRIPTIONS, { connection: redisConnection });

export class SchedulerService {
  async scheduleNextBilling(subscriptionId: number, nextBillingDate?: Date) {
    const delay = nextBillingDate ? nextBillingDate.getTime() - Date.now() : 0;
    await subscriptionQueue.add(
      `subscription-${subscriptionId}`,
      { subscriptionId },
      { delay: Math.max(delay, 0) }
    );
  }

  async startWorker() {
    // Create worker but don't start it immediately to avoid BullMQ issues
    const worker = new Worker(
      QUEUE_NAMES.SUBSCRIPTIONS,
      async (job) => {
        const { subscriptionId } = job.data;
        console.log(`Processing subscription ${subscriptionId} from scheduler...`);
        const order = await orderService.processSubscriptionOrder(subscriptionId);
        console.log(`Subscription ${subscriptionId} processed. Order ID: ${order.id}`);
        return { success: true, orderId: order.id };
      },
      { connection: redisConnection, autorun: false } // Don't auto-start
    );

    return worker;
  }
}

export const schedulerService = new SchedulerService();
