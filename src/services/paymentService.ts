import { db } from '../db/connection.ts';
import { subscriptions, subscriptionPlans } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export class PaymentService {
  async simulatePayment(subscriptionId: number): Promise<{ success: boolean; message: string }> {
    // Simulate payment gateway with 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      return { success: true, message: 'Payment processed successfully' };
    } else {
      return { success: false, message: 'Payment failed: Insufficient funds' };
    }
  }

  async processSubscriptionPayment(subscriptionId: number) {
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        plan: {
          price: subscriptionPlans.price,
        }
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id));

    if (!subscription || subscription.status !== 'active') {
      return { success: false, message: 'Subscription not active' };
    }

    return await this.simulatePayment(subscriptionId);
  }
}

export const paymentService = new PaymentService();