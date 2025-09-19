import { Queue, Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '../config/redis';
import { db } from '../db/connection.ts';
import { subscriptions, subscriptionPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { orderService } from './orderService.ts';
import { notificationService } from './notificationService.ts';
import { auditService } from './auditService.ts';

const redisConnection = getRedisConnection();

export const subscriptionQueue = new Queue(QUEUE_NAMES.SUBSCRIPTIONS, { 
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  }
});

export class SchedulerService {
  private worker: Worker | null = null;

  async scheduleNextBilling(subscriptionId: number, nextBillingDate: Date): Promise<void> {
    if (!nextBillingDate) {
      throw new Error('nextBillingDate is required');
    }

    if (nextBillingDate.getTime() <= Date.now()) {
      throw new Error('nextBillingDate must be in the future');
    }

    const delay = nextBillingDate.getTime() - Date.now();

    await this.unscheduleSubscription(subscriptionId);

    await subscriptionQueue.add(
      `process-subscription-${subscriptionId}`,
      { subscriptionId },
      {
        jobId: `subscription-${subscriptionId}-${nextBillingDate.getTime()}`,
        delay: Math.max(delay, 0),
      }
    );

    console.log(`Scheduled subscription ${subscriptionId} for ${nextBillingDate}`);
  }

  async unscheduleSubscription(subscriptionId: number): Promise<void> {
    const jobs = await subscriptionQueue.getJobs(['waiting', 'delayed', 'active']);
    
    for (const job of jobs) {
      if (job.name.startsWith(`process-subscription-${subscriptionId}`)) {
        await job.remove();
        console.log(`Removed existing job for subscription ${subscriptionId}`);
      }
    }
  }

  async startWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    this.worker = new Worker(
      QUEUE_NAMES.SUBSCRIPTIONS,
      async (job) => {
        const { subscriptionId } = job.data;
        
        console.log(`Processing subscription ${subscriptionId} from scheduler...`);
        
        try {
          const [subscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.id, subscriptionId));

          if (!subscription) {
            throw new Error(`Subscription ${subscriptionId} not found`);
          }

          if (subscription.status !== 'active') {
            console.log(`Skipping subscription ${subscriptionId} - status: ${subscription.status}`);
            return { success: false, reason: `Subscription status: ${subscription.status}` };
          }

          const order = await orderService.processSubscriptionOrder(subscriptionId);
          
          console.log(`Subscription ${subscriptionId} processed successfully. Order ID: ${order.id}`);
          
          await notificationService.sendOrderConfirmation(subscription.userId, order.id);
          
          return { success: true, orderId: order.id };
        } catch (error: any) {
          console.error(`Failed to process subscription ${subscriptionId}:`, error);
          
          let newStatus: 'payment_failed' | 'paused' | 'active' = 'active';
          
          if (error.message.includes('payment') || error.message.includes('Payment')) {
            newStatus = 'payment_failed';
            await notificationService.sendPaymentFailedNotification(subscriptionId);
          } else if (error.message.includes('inventory') || error.message.includes('stock') || error.message.includes('Insufficient')) {
            newStatus = 'paused';
          }

          if (newStatus !== 'active') {
            await db
              .update(subscriptions)
              .set({ 
                status: newStatus,
                updatedAt: new Date() 
              })
              .where(eq(subscriptions.id, subscriptionId));

            await auditService.logEvent({
              userId: subscriptionId,
              action: `${newStatus}_update`,
              resourceType: 'subscription',
              resourceId: subscriptionId,
              details: { error: error.message },
              status: 'failure'
            });
          }
          
          throw error;
        }
      },
      { 
        connection: redisConnection, 
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        }
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully for subscription ${job.data.subscriptionId}`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed for subscription ${job?.data.subscriptionId}:`, error);
    });

    this.worker.on('error', (error) => {
      console.error('Scheduler worker error:', error);
    });

    console.log('Scheduler worker started successfully');
    return this.worker;
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('Scheduler worker stopped');
    }
  }

  async getScheduledJobs(): Promise<any[]> {
    return await subscriptionQueue.getJobs(['waiting', 'delayed', 'active']);
  }

  async cleanup(): Promise<void> {
    await this.stopWorker();
    await subscriptionQueue.close();
    await redisConnection.quit();
  }

  // Helper method to schedule all active subscriptions on startup
  async scheduleAllActiveSubscriptions(): Promise<void> {
    console.log('Scheduling all active subscriptions...');
    
    const activeSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    for (const subscription of activeSubscriptions) {
      try {
        if (subscription.nextBillingDate && new Date(subscription.nextBillingDate) > new Date()) {
          await this.scheduleNextBilling(subscription.id, new Date(subscription.nextBillingDate));
          console.log(`Scheduled active subscription ${subscription.id}`);
        }
      } catch (error) {
        console.error(`Failed to schedule subscription ${subscription.id}:`, error);
      }
    }
  }
}

export const schedulerService = new SchedulerService();