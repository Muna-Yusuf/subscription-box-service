import { describe, it, expect, beforeEach } from 'bun:test';
import { inventoryService } from '@src/services/inventoryService';
import { db } from '@db';
import { products, fulfillmentCenters, inventory } from '../../src/db/schema';

describe('Concurrency Tests', () => {
  beforeEach(async () => {
    await db.delete(inventory);
    await db.delete(products);
    await db.delete(fulfillmentCenters);
  });

  it('should handle concurrent inventory updates atomically', async () => {
    const [product] = await db.insert(products).values({
      name: 'Test Product',
      price: 1999,
      sku: 'TEST-001',
    }).returning();

    const [center] = await db.insert(fulfillmentCenters).values({
      name: 'Test Center',
      address: '123 Test St',
    }).returning();

    await db.insert(inventory).values({
      productId: product.id,
      fulfillmentCenterId: center.id,
      quantity: 10,
    });

    // Simulate concurrent updates
    const concurrentUpdates = Array(5).fill(0).map(() =>
      inventoryService.decrementInventory(product.id, center.id, 1)
    );

    const results = await Promise.allSettled(concurrentUpdates);
    const successfulUpdates = results.filter(r => r.status === 'fulfilled');

    // Check final quantity
    const [finalInventory] = await db
      .select()
      .from(inventory)
      .where(inventory.productId === product.id && inventory.fulfillmentCenterId === center.id);

    expect(finalInventory.quantity).toBe(5); // 10 - 5 successful updates
    expect(successfulUpdates).toHaveLength(5);
  });

  it('should prevent negative inventory with concurrent updates', async () => {
    const [product] = await db.insert(products).values({
      name: 'Test Product',
      price: 1999,
      sku: 'TEST-001',
    }).returning();

    const [center] = await db.insert(fulfillmentCenters).values({
      name: 'Test Center',
      address: '123 Test St',
    }).returning();

    await db.insert(inventory).values({
      productId: product.id,
      fulfillmentCenterId: center.id,
      quantity: 3,
    });

    // Try to decrement more than available
    const concurrentUpdates = Array(5).fill(0).map(() =>
      inventoryService.decrementInventory(product.id, center.id, 1)
    );

    const results = await Promise.allSettled(concurrentUpdates);
    const successfulUpdates = results.filter(r => r.status === 'fulfilled');
    const failedUpdates = results.filter(r => r.status === 'rejected');

    // Check final quantity
    const [finalInventory] = await db
      .select()
      .from(inventory)
      .where(inventory.productId === product.id && inventory.fulfillmentCenterId === center.id);

    expect(finalInventory.quantity).toBe(0); // Should not go negative
    expect(successfulUpdates).toHaveLength(3); // Only 3 should succeed
    expect(failedUpdates).toHaveLength(2); // 2 should fail
  });
});