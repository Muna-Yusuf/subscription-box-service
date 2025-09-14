import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test';
import { db } from '../src/db/connection';
import * as schema from '../src/db/schema';

// Global test setup
beforeAll(async () => {
  // Clear database before all tests
  await Promise.all([
    db.delete(schema.orders),
    db.delete(schema.inventory),
    db.delete(schema.subscriptions),
    db.delete(schema.subscriptionPlans),
    db.delete(schema.products),
    db.delete(schema.fulfillmentCenters),
    db.delete(schema.users),
    db.delete(schema.auditLogs),
  ]);
});

beforeEach(async () => {
  // Reset database state before each test
  await Promise.all([
    db.delete(schema.orders),
    db.delete(schema.inventory),
    db.delete(schema.subscriptions),
    db.delete(schema.subscriptionPlans),
    db.delete(schema.products),
    db.delete(schema.fulfillmentCenters),
    db.delete(schema.users),
    db.delete(schema.auditLogs),
  ]);
});

afterEach(async () => {
  // Clean up after each test
});

afterAll(async () => {
  // Close database connection after all tests
  await db.client.end();
});