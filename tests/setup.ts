// tests/setup.ts
import { afterEach, beforeEach, vi } from 'vitest';
import { db } from '../src/db/connection';
import { 
  users, subscriptions, subscriptionPlans, products, 
  fulfillmentCenters, inventory, orders, auditLogs 
} from '../src/db/schema';

// Mock all external dependencies
vi.mock('../src/db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  }
}));

vi.mock('../src/config/redis', () => ({
  getRedisConnection: vi.fn(),
  QUEUE_NAMES: {
    SUBSCRIPTIONS: 'subscriptions',
    NOTIFICATIONS: 'notifications'
  }
}));

// Mock BullMQ
vi.mock('bullmq', () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
  QueueScheduler: vi.fn()
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
  sql: vi.fn().mockReturnValue('SQL_EXPRESSION')
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});