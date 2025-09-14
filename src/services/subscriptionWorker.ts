import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '../config/redis.ts';
import { db } from '../db/connection.ts';
import { subscriptions } from '../db/schema.ts';
import { orderService } from './orderService.ts';
import { schedulerService } from './schedulerService.ts';
import { eq } from 'drizzle-orm';

const redisConnection = getRedisConnection();

const subscriptionWorker = new Worker(
  QUEUE_NAMES.SUBSCRIPTIONS,
  async (job) => {
    const { subscriptionId } = job.data;

    try {
      console.log(`Processing subscription ${subscriptionId}`);
      const order = await orderService.processSubscriptionOrder(subscriptionId);
      console.log(`Successfully processed subscription ${subscriptionId}, order ${order.id}`);
      await schedulerService.scheduleNextBilling(subscriptionId);
      return { success: true, orderId: order.id };
    } catch (error: any) {
      console.error(`Failed to process subscription ${subscriptionId}:`, error);
      await db.update(subscriptions).set({
        status: error.message.includes('payment') ? 'payment_failed' : 'paused',
        updatedAt: new Date(),
      }).where(eq(subscriptions.id, subscriptionId));
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 3, removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } }
);

subscriptionWorker.on('completed', job => console.log(`Job ${job.id} completed successfully`));
subscriptionWorker.on('failed', (job, error) => console.error(`Job ${job?.id} failed:`, error));
subscriptionWorker.on('error', error => console.error('Worker error:', error));

const shutdown = async () => {
  console.log('Shutting down worker gracefully...');
  await subscriptionWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Subscription worker started. Waiting for jobs...');
schedulerService.startWorker();
console.log('Scheduler worker started...');