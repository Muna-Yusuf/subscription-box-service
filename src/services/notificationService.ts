import { Queue } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '../config/redis';
import { db } from '../db/connection.ts';
import { subscriptions, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const redisConnection = getRedisConnection();

export interface NotificationData {
  userId: number;
  message: string;
  type: 'payment_failed' | 'order_confirmation' | 'renewal_notice' | 'subscription_update';
  metadata?: Record<string, any>;
}

export class NotificationService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { 
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    });
  }

  async sendNotification(data: NotificationData): Promise<void> {
    await this.queue.add('send-notification', data, {
      jobId: `notification-${data.userId}-${Date.now()}-${data.type}`
    });
    console.log(`Scheduled notification for user ${data.userId}: ${data.type}`);
  }

  async sendPaymentFailedNotification(subscriptionId: number): Promise<void> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, subscription.userId));

    if (!user) {
      throw new Error('User not found');
    }

    await this.sendNotification({
      userId: user.id,
      message: `Payment failed for your subscription. Please update your payment method to avoid service interruption.`,
      type: 'payment_failed',
      metadata: { subscriptionId }
    });
  }

  async sendOrderConfirmation(userId: number, orderId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    await this.sendNotification({
      userId,
      message: `Your order #${orderId} has been confirmed and will be shipped soon. Thank you for your subscription!`,
      type: 'order_confirmation',
      metadata: { orderId }
    });
  }

  async sendSubscriptionRenewalNotice(subscriptionId: number): Promise<void> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, subscription.userId));

    if (!user) {
      throw new Error('User not found');
    }

    await this.sendNotification({
      userId: user.id,
      message: `Heads up! Your subscription will automatically renew on ${subscription.nextBillingDate.toDateString()}.`,
      type: 'renewal_notice',
      metadata: { subscriptionId, nextBillingDate: subscription.nextBillingDate }
    });
  }

  async sendSubscriptionStatusUpdate(userId: number, status: string, subscriptionId: number): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    await this.sendNotification({
      userId,
      message: `Your subscription status has been updated to: ${status}.`,
      type: 'subscription_update',
      metadata: { subscriptionId, status }
    });
  }

  async cleanup(): Promise<void> {
    await this.queue.close();
  }
}

export const notificationService = new NotificationService();