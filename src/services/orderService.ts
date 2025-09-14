import { db, orders } from '../db/connection.ts';
import { subscriptions, products } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { inventoryService } from './inventoryService';
import { paymentService } from './paymentService';

export class OrderService {
  async processSubscriptionOrder(subscriptionId: number) {
    return await db.transaction(async (tx) => {
      const [subscription] = await tx
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          planId: subscriptions.planId,
          status: subscriptions.status,
          product: {
            id: products.id,
            name: products.name,
            price: products.price,
          }
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .leftJoin(products, eq(subscriptions.planId, products.id));

      if (!subscription || subscription.status !== 'active') {
        throw new Error('Subscription not found or not active');
      }

      const inventoryResult = await inventoryService.reserveInventory(subscription.product.id);
      if (!inventoryResult.success) {
        await tx
          .update(subscriptions)
          .set({ status: 'paused', updatedAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));
        throw new Error('Insufficient inventory, subscription paused');
      }

      const paymentResult = await paymentService.processSubscriptionPayment(subscriptionId);
      if (!paymentResult.success) {
        await tx
          .update(inventory)
          .set({ quantity: sql`${inventory.quantity} + 1` })
          .where(and(
            eq(inventory.productId, subscription.product.id),
            eq(inventory.fulfillmentCenterId, inventoryResult.fulfillmentCenterId)
          ));
        
        await tx
          .update(subscriptions)
          .set({ status: 'payment_failed', updatedAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));
        
        throw new Error(`Payment failed: ${paymentResult.message}`);
      }

      const [order] = await tx
        .insert(orders)
        .values({
          subscriptionId: subscription.id,
          productId: subscription.product.id,
          fulfillmentCenterId: inventoryResult.fulfillmentCenterId,
          status: 'processed',
        })
        .returning();

      const nextBillingDate = this.calculateNextBillingDate(new Date());
      await tx
        .update(subscriptions)
        .set({ 
          nextBillingDate,
          updatedAt: new Date(),
          status: 'active'
        })
        .where(eq(subscriptions.id, subscriptionId));

      return order;
    });
  }

  private calculateNextBillingDate(currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }
}

export const orderService = new OrderService();