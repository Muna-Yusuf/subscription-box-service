import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { inventoryService } from '../../src/services/inventoryService.ts';
import { db } from '../../src/db/connection.ts';
import { products, fulfillmentCenters, inventory } from '../../src/db/schema.ts';

describe('Multi-Fulfillment Center Logic', () => {
  let testProductId: string;
  let center1Id: string;
  let center2Id: string;
  let center3Id: string;

  beforeEach(async () => {
    await db.delete(inventory);
    await db.delete(fulfillmentCenters);
    await db.delete(products);

    // Create test product
    const [product] = await db.insert(products).values({
      name: 'Test Product',
      description: 'Test Description',
      price: 2999,
      sku: 'TEST-001',
      createdAt: new Date()
    }).returning();

    // Create multiple fulfillment centers with correct schema
    const [center1] = await db.insert(fulfillmentCenters).values({
      name: 'Center 1 - East',
      address: '123 Main St, New York', // Added required address field
      createdAt: new Date()
    }).returning();

    const [center2] = await db.insert(fulfillmentCenters).values({
      name: 'Center 2 - West',
      address: '456 Oak St, Los Angeles',
      createdAt: new Date()
    }).returning();

    const [center3] = await db.insert(fulfillmentCenters).values({
      name: 'Center 3 - Central',
      address: '789 Pine St, Chicago',
      createdAt: new Date()
    }).returning();

    // Create inventory with different quantities
    await db.insert(inventory).values([
      {
        productId: product.id,
        fulfillmentCenterId: center1.id,
        quantity: 5,
        createdAt: new Date()
      },
      {
        productId: product.id,
        fulfillmentCenterId: center2.id,
        quantity: 10,
        createdAt: new Date()
      },
      {
        productId: product.id,
        fulfillmentCenterId: center3.id,
        quantity: 0, // Out of stock
        createdAt: new Date()
      }
    ]);

    testProductId = product.id;
    center1Id = center1.id;
    center2Id = center2.id;
    center3Id = center3.id;
  });

  afterEach(async () => {
    await db.delete(inventory);
    await db.delete(fulfillmentCenters);
    await db.delete(products);
  });

  it('should have inventory service methods', () => {
    expect(inventoryService.findNearestAvailableInventory).toBeDefined();
  });

  it('should handle basic inventory operations', async () => {
    // Test that the service can be called without errors
    await expect(
      inventoryService.findNearestAvailableInventory(testProductId, 1)
    ).resolves.toBeDefined();
  });
});