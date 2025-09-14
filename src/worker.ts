import { getRedisConnection, QUEUE_NAMES } from './config/redis.ts';
import { db } from './db/connection.ts';
import { subscriptions } from './db/schema.ts';
import { orderService } from './services/orderService.ts';
import { schedulerService } from './services/schedulerService.ts';
import { eq } from 'drizzle-orm';

// --- BullMQ wrapper for Bun compatibility ---
let WorkerClass: any;
let QueueSchedulerClass: any;

try {
  // Node / production
  const bullmq = await import('bullmq');
  WorkerClass = bullmq.Worker;
  QueueSchedulerClass = bullmq.QueueScheduler;
} catch (err) {
  console.warn('BullMQ import failed (likely Bun). Using mocks...');
  WorkerClass = class {
    constructor(queueName: string, processor: any, opts: any) {}
    on(event: string, callback: any) {}
    close() { return Promise.resolve(); }
  };
  QueueSchedulerClass = class {
    constructor(queueName: string, opts: any) {}
  };
}

// Get Redis connection
const redisConnection = getRedisConnection();

// Initialize QueueScheduler if available
if (QueueSchedulerClass) {
  new QueueSchedulerClass(QUEUE_NAMES.SUBSCRIPTIONS, { connection: redisConnection });
}

// Subscription processing worker
const subscriptionWorker = new WorkerClass(
  QUEUE_NAMES.SUBSCRIPTIONS,
  async (job: any) => {
    const { subscriptionId } = job.data;

    try {
      console.log(`Processing subscription ${subscriptionId}`);

      // Process order
      const order = await orderService.processSubscriptionOrder(subscriptionId);
      console.log(`Successfully processed subscription ${subscriptionId}, order ${order.id}`);

      // Schedule next billing date
      await schedulerService.scheduleNextBilling(subscriptionId);

      return { success: true, orderId: order.id };
    } catch (error: any) {
      console.error(`Failed to process subscription ${subscriptionId}:`, error);

      // Update subscription status based on error type
      await db
        .update(subscriptions)
        .set({
          status: error.message.includes('payment') ? 'payment_failed' : 'paused',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId));

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  }
);

// Event listeners
subscriptionWorker.on('completed', (job: any) => {
  console.log(`Job ${job.id} completed successfully`);
});

subscriptionWorker.on('failed', (job: any, error: any) => {
  console.error(`Job ${job?.id} failed:`, error);
});

subscriptionWorker.on('error', (error: any) => {
  console.error('Worker error:', error);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down worker gracefully...');
  await subscriptionWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Subscription worker started. Waiting for jobs...');

// Start background scheduler worker
schedulerService.startWorker();
console.log('Scheduler worker started...');