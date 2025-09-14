import { db, inventory } from '../db/connection.ts';
import { products, fulfillmentCenters } from '../db/schema.ts';
import { and, eq, gt, sql } from 'drizzle-orm';

export class InventoryService {
  async decrementInventory(productId: number, fulfillmentCenterId: number, quantity: number = 1) {
    return await db.transaction(async (tx) => {
      const [result] = await tx
        .update(inventory)
        .set({ quantity: sql`${inventory.quantity} - ${quantity}` })
        .where(and(
          eq(inventory.productId, productId),
          eq(inventory.fulfillmentCenterId, fulfillmentCenterId),
          gt(inventory.quantity, quantity - 1)
        ))
        .returning();

      if (!result) {
        throw new Error('Insufficient inventory or product not found');
      }

      return result;
    });
  }

  async findNearestAvailableInventory(productId: number, userLat?: string, userLon?: string) {
    // Simple implementation - in production, use proper geospatial queries
    const availableInventory = await db
      .select({
        inventoryId: inventory.id,
        productId: inventory.productId,
        fulfillmentCenterId: inventory.fulfillmentCenterId,
        quantity: inventory.quantity,
        centerName: fulfillmentCenters.name,
        centerAddress: fulfillmentCenters.address,
      })
      .from(inventory)
      .where(and(
        eq(inventory.productId, productId),
        gt(inventory.quantity, 0)
      ))
      .leftJoin(fulfillmentCenters, eq(inventory.fulfillmentCenterId, fulfillmentCenters.id))
      .orderBy(inventory.quantity); // Prioritize centers with more stock

    if (availableInventory.length === 0) {
      throw new Error('Product out of stock at all fulfillment centers');
    }

    return availableInventory[0]; // Return first available
  }

  async reserveInventory(productId: number, quantity: number = 1) {
    const availableInventory = await this.findNearestAvailableInventory(productId);
    
    try {
      const result = await this.decrementInventory(productId, availableInventory.fulfillmentCenterId, quantity);
      return {
        success: true,
        fulfillmentCenterId: availableInventory.fulfillmentCenterId,
        remainingQuantity: result.quantity,
      };
    } catch (error) {
      // Try next available center
      const otherCenters = await db
        .select({
          fulfillmentCenterId: inventory.fulfillmentCenterId,
          quantity: inventory.quantity,
        })
        .from(inventory)
        .where(and(
          eq(inventory.productId, productId),
          gt(inventory.quantity, 0),
          eq(inventory.fulfillmentCenterId, availableInventory.fulfillmentCenterId)
        ))
        .orderBy(inventory.quantity);

      for (const center of otherCenters) {
        try {
          const result = await this.decrementInventory(productId, center.fulfillmentCenterId, quantity);
          return {
            success: true,
            fulfillmentCenterId: center.fulfillmentCenterId,
            remainingQuantity: result.quantity,
          };
        } catch (error) {
          continue;
        }
      }

      return { success: false, message: 'Product out of stock at all centers' };
    }
  }
}

export const inventoryService = new InventoryService();