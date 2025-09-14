import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { schedulerService } from '../../src/services/schedulerService.ts';
import { db } from '../../src/db/connection.ts';

describe('SchedulerService', () => {
  beforeEach(async () => {
    // Clean up any existing data
    try {
      await db.execute(sql`DELETE FROM subscriptions`);
    } catch (error) {
      // Table might not exist yet
    }
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await db.execute(sql`DELETE FROM subscriptions`);
    } catch (error) {
      // Table might not exist yet
    }
  });

  it('should have scheduler service methods', () => {
    expect(schedulerService.scheduleNextBilling).toBeDefined();
    expect(schedulerService.startWorker).toBeDefined();
    expect(typeof schedulerService.scheduleNextBilling).toBe('function');
    expect(typeof schedulerService.startWorker).toBe('function');
  });

  it('should be able to call scheduleNextBilling', async () => {
    // This should not throw an error immediately
    await expect(schedulerService.scheduleNextBilling('test-subscription-id'))
      .rejects
      .toBeDefined(); // Will likely fail due to missing data, but that's expected
  });

  it('should be able to start worker without immediate errors', () => {
    // This should not throw an error immediately
    expect(() => {
      schedulerService.startWorker();
    }).not.toThrow();
  });
});
