import { describe, it, expect } from 'bun:test';

describe('Simple Scheduler Test', () => {
  it('should import scheduler service without errors', () => {
    expect(() => {
      require('../src/services/schedulerService.ts');
    }).not.toThrow();
  });

  it('should have scheduler service methods', () => {
    const { schedulerService } = require('../src/services/schedulerService.ts');
    expect(schedulerService.scheduleNextBilling).toBeDefined();
    expect(schedulerService.startWorker).toBeDefined();
  });

  it('should have queue constants', () => {
    const { QUEUE_NAMES, subscriptionQueue } = require('../src/services/schedulerService.ts');
    expect(QUEUE_NAMES.SUBSCRIPTIONS).toBe('subscriptions');
    expect(subscriptionQueue).toBeDefined();
  });
});
