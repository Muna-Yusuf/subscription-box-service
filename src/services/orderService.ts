import { db, orders } from '../db/connection.ts';
import { subscriptions, products, subscriptionPlans, inventory } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { inventoryService } from './inventoryService';
import { paymentService } from './paymentService';
import { notificationService } from './notificationService';
import { auditService } from './auditService';

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
            sku: products.sku
          }
        })
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .leftJoin(products, eq(subscriptionPlans.productId, products.id)); // Fixed join

      if (!subscription || subscription.status !== 'active') {
        throw new Error('Subscription not found or not active');
      }

      if (!subscription.product) {
        throw new Error('Product not found for subscription plan');
      }

      const inventoryResult = await inventoryService.reserveInventory(subscription.product.id);
      
      if (!inventoryResult.success) {
        await tx
          .update(subscriptions)
          .set({ status: 'paused', updatedAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));

        await auditService.logEvent({
          userId: subscription.userId,
          action: 'inventory_shortage',
          resourceType: 'subscription',
          resourceId: subscriptionId,
          details: { productId: subscription.product.id },
          status: 'failure'
        });

        throw new Error('Insufficient inventory, subscription paused');
      }

      const paymentResult = await paymentService.processSubscriptionPayment(subscriptionId);
      
      if (!paymentResult.success) {
        // Rollback inventory reservation
        await tx
          .update(inventory)
          .set({ quantity: sql`${inventory.quantity} + 1` })
          .where(and(
            eq(inventory.productId, subscription.product.id),
            eq(inventory.fulfillmentCenterId, inventoryResult.fulfillmentCenterId!)
          ));

        await tx
          .update(subscriptions)
          .set({ status: 'payment_failed', updatedAt: new Date() })
          .where(eq(subscriptions.id, subscriptionId));

        await auditService.logEvent({
          userId: subscription.userId,
          action: 'payment_failed',
          resourceType: 'subscription',
          resourceId: subscriptionId,
          details: { reason: paymentResult.message },
          status: 'failure'
        });

        await notificationService.sendPaymentFailedNotification(subscriptionId);

        throw new Error(`Payment failed: ${paymentResult.message}`);
      }

      const [order] = await tx
        .insert(orders)
        .values({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          productId: subscription.product.id,
          fulfillmentCenterId: inventoryResult.fulfillmentCenterId!,
          amount: subscription.product.price,
          status: 'processed',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      const nextBillingDate = this.calculateNextBillingDate(new Date());
      await tx
        .update(subscriptions)
        .set({ 
          nextBillingDate: nextBillingDate.toISOString().split('T')[0],
          updatedAt: new Date(),
          status: 'active'
        })
        .where(eq(subscriptions.id, subscriptionId));

      await auditService.logEvent({
        userId: subscription.userId,
        action: 'order_created',
        resourceType: 'order',
        resourceId: order.id,
        details: { 
          productId: subscription.product.id,
          fulfillmentCenterId: inventoryResult.fulfillmentCenterId
        },
        status: 'success'
      });

      await notificationService.sendOrderConfirmation(subscription.userId, order.id);

      return order;
    });
  }

  private calculateNextBillingDate(currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  async getOrderById(orderId: number) {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: number) {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(orders.createdAt);
  }
}

export const orderService = new OrderService();