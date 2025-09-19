// tests/services.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { db, users, products, subscriptions, fulfillmentCenters, inventory, orders, subscriptionPlans, auditLogs } from '../src/db/connection';
import bcrypt from 'bcrypt';

// Routers
import usersRouter from '../src/routes/users';
import productsRouter from '../src/routes/products';
import inventoryRouter from '../src/routes/inventory';
import fulfillmentCentersRouter from '../src/routes/fulfillmentCenters';
import ordersRouter from '../src/routes/orders';
import subscriptionsRouter from '../src/routes/subscriptions';

// Services
import { subscriptionService } from '../src/services/subscriptionService';
import { inventoryService } from '../src/services/inventoryService';
import { orderService } from '../src/services/orderService';
import { auditService } from '../src/services/auditService';
import { generateToken } from '../src/middleware/auth';

// --- Test Data ---
const TEST_USER = { email: 'test@example.com', firstName: 'Test', lastName: 'User', password: 'password123' };
const TEST_ADMIN = { email: 'admin@example.com', firstName: 'Admin', lastName: 'User', password: 'admin123' };
const TEST_PRODUCT = { name: 'Test Product', description: 'A test product', price: 500, sku: 'TEST-001' };
const TEST_PLAN = { name: 'Monthly Plan', billingCycle: 'monthly' as const, price: 1000 };
const TEST_FC = { name: 'Test FC', address: '123 Street', latitude: '0', longitude: '0' };

// --- Helpers ---
const createTestUser = async (userData = TEST_USER, role: 'user' | 'admin' = 'user') => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const [user] = await db.insert(users).values({ ...userData, passwordHash: hashedPassword, role }).returning();
  return user;
};

const createTestProduct = async () => (await db.insert(products).values(TEST_PRODUCT).returning())[0];
const createTestPlan = async (productId: number) => (await db.insert(subscriptionPlans).values({ ...TEST_PLAN, productId }).returning())[0];
const createTestFC = async () => (await db.insert(fulfillmentCenters).values(TEST_FC).returning())[0];
const addInventory = async (productId: number, fcId: number, quantity: number) => (await db.insert(inventory).values({ productId, fulfillmentCenterId: fcId, quantity }).returning())[0];
const getAuthHeaders = (userId: number, role: 'user' | 'admin' = 'user') => ({ 'Authorization': `Bearer ${generateToken({ userId, role })}`, 'Content-Type': 'application/json' });

// --- Setup & Teardown ---
beforeEach(async () => {
  // Clean child tables first to avoid FK violations
  await db.delete(orders);
  await db.delete(subscriptions);
  await db.delete(subscriptionPlans);
  await db.delete(inventory);
  await db.delete(fulfillmentCenters);
  await db.delete(products);
  await db.delete(users);
  await db.delete(auditLogs);
});

afterAll(async () => {
  // No db.end() needed for Drizzle/Postgres-js
});

// --- Tests ---
describe('Complete Subscription Box Service Tests', () => {
  describe('User Management', () => {
    it('creates a new user successfully', async () => {
  const app = new Hono();
  app.route('/users', usersRouter);

  const res = await app.fetch('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });

  expect(res.status).toBe(201);

  const body = await res.json();

  // Adjusted checks based on what your route actually returns
  expect(body).toHaveProperty('user');
  expect(body.user.email).toBe(TEST_USER.email);

  expect(body).toHaveProperty('token'); // only if your route returns a token
});


    it('logs in user with correct credentials', async () => {
      await createTestUser();
      const app = new Hono().route('/users', usersRouter);
      const res = await app.request('/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('token');
    });

    it('rejects login with wrong credentials', async () => {
      await createTestUser();
      const app = new Hono().route('/users', usersRouter);
      const res = await app.request('/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: TEST_USER.email, password: 'wrongpass' }) });
      expect(res.status).toBe(401);
    });
  });

  describe('Product Management', () => {
    it('allows admin to create product', async () => {
      const admin = await createTestUser(TEST_ADMIN, 'admin');
      const headers = getAuthHeaders(admin.id, 'admin');
      const app = new Hono().route('/products', productsRouter);
      const res = await app.request('/products', { method: 'POST', headers, body: JSON.stringify(TEST_PRODUCT) });
      expect(res.status).toBe(201);
    });

    it('rejects non-admin creating product', async () => {
      const user = await createTestUser();
      const headers = getAuthHeaders(user.id);
      const app = new Hono().route('/products', productsRouter);
      const res = await app.request('/products', { method: 'POST', headers, body: JSON.stringify(TEST_PRODUCT) });
      expect(res.status).toBe(403);
    });
  });

  describe('Fulfillment Center Management', () => {
    it('allows admin to create fulfillment center', async () => {
      const admin = await createTestUser(TEST_ADMIN, 'admin');
      const headers = getAuthHeaders(admin.id, 'admin');
      const app = new Hono().route('/fulfillment-centers', fulfillmentCentersRouter);
      const res = await app.request('/fulfillment-centers', { method: 'POST', headers, body: JSON.stringify(TEST_FC) });
      expect(res.status).toBe(201);
    });

    it('rejects non-admin access', async () => {
      const user = await createTestUser();
      const headers = getAuthHeaders(user.id);
      const app = new Hono().route('/fulfillment-centers', fulfillmentCentersRouter);
      const res = await app.request('/fulfillment-centers', { method: 'GET', headers });
      expect(res.status).toBe(403);
    });
  });

  describe('Inventory Management', () => {
    it('allows admin to add inventory', async () => {
      const admin = await createTestUser(TEST_ADMIN, 'admin');
      const headers = getAuthHeaders(admin.id, 'admin');
      const product = await createTestProduct();
      const fc = await createTestFC();
      const app = new Hono().route('/inventory', inventoryRouter);
      const res = await app.request('/inventory', { method: 'POST', headers, body: JSON.stringify({ productId: product.id, fulfillmentCenterId: fc.id, quantity: 50 }) });
      expect(res.status).toBe(201);
    });
  });

  describe('Subscription Service', () => {
    it('creates subscription successfully', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();
      const plan = await createTestPlan(product.id);
      const sub = await subscriptionService.createForUser(user.id, plan.id);
      expect(sub.userId).toBe(user.id);
      expect(sub.planId).toBe(plan.id);
      expect(sub.status).toBe('active');
    });

    it('processes subscription order successfully', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();
      const plan = await createTestPlan(product.id);
      const fc = await createTestFC();
      await addInventory(product.id, fc.id, 10);
      const sub = await subscriptionService.createForUser(user.id, plan.id);
      const order = await orderService.processSubscriptionOrder(sub.id);
      expect(order.subscriptionId).toBe(sub.id);
    });
  });

  describe('Audit Service', () => {
    it('logs events successfully', async () => {
      const user = await createTestUser();
      await auditService.logEvent({
        userId: user.id,
        action: 'create',
        resourceType: 'user',
        resourceId: user.id,
        status: 'success',
      });

      const logs = await db.select().from(auditLogs);
      expect(logs.length).toBe(1);
      expect(logs[0].entity).toBe('user');
      expect(logs[0].entityId).toBe(String(user.id));
    });
  });
});
