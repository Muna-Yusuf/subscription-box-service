import { describe, it, expect, beforeEach } from 'bun:test';
import { inventoryService } from '@src/services/inventoryService';
import { db } from '@db';
import { products, fulfillmentCenters, inventory } from '../../src/db/schema';

describe('Inventory Service', () => {
  beforeEach(async () => {
    await db.delete(inventory);
    await db.delete(products);
    await db.delete(fulfillmentCenters);
  });

  it('should decrement inventory successfully', async () => {
    const [product] = await db.insert(products).values({
      name: 'Test Product',
      price: 1999,
      sku: 'TEST-001',
    }).returning();

    const [center] = await db.insert(fulfillmentCenters).values({
      name: 'Test Center',
      address: '123 Test St',
    }).returning();

    const [inv] = await db.insert(inventory).values({
      productId: product.id,
      fulfillmentCenterId: center.id,
      quantity: 10,
    }).returning();

    const result = await inventoryService.decrementInventory(product.id, center.id, 2);
    expect(result.quantity).toBe(8);
  });

  it('should throw error for insufficient inventory', async () => {
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
      quantity: 1,
    });

    await expect(inventoryService.decrementInventory(product.id, center.id, 2))
      .rejects
      .toThrow('Insufficient inventory or product not found');
  });

  it('should find nearest available inventory', async () => {
    const [product] = await db.insert(products).values({
      name: 'Test Product',
      price: 1999,
      sku: 'TEST-001',
    }).returning();

    const [center1] = await db.insert(fulfillmentCenters).values({
      name: 'Center 1',
      address: '123 Test St',
    }).returning();

    const [center2] = await db.insert(fulfillmentCenters).values({
      name: 'Center 2',
      address: '456 Test St',
    }).returning();

    await db.insert(inventory).values([
      { productId: product.id, fulfillmentCenterId: center1.id, quantity: 0 },
      { productId: product.id, fulfillmentCenterId: center2.id, quantity: 5 },
    ]);

    const result = await inventoryService.findNearestAvailableInventory(product.id);
    expect(result.quantity).toBe(5);
    expect(result.fulfillmentCenterId).toBe(center2.id);
  });
});