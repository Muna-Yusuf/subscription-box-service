import { describe, it, expect } from 'bun:test';
import { SubscriptionScheduler } from '../../src/jobs/subscriptionScheduler';

describe('Subscription Scheduler', () => {
  it('should create cron pattern for monthly billing', () => {
    const scheduler = new SubscriptionScheduler();
    const testDate = new Date('2024-01-15');
    const pattern = (scheduler as any).getCronPattern('monthly', testDate);
    expect(pattern).toBe('0 0 15 * *');
  });

  it('should create cron pattern for quarterly billing', () => {
    const scheduler = new SubscriptionScheduler();
    const testDate = new Date('2024-01-15');
    const pattern = (scheduler as any).getCronPattern('quarterly', testDate);
    expect(pattern).toBe('0 0 15 */3 *');
  });

  it('should create cron pattern for annual billing', () => {
    const scheduler = new SubscriptionScheduler();
    const testDate = new Date('2024-01-15');
    const pattern = (scheduler as any).getCronPattern('annually', testDate);
    expect(pattern).toBe('0 0 15 1 *');
  });

  it('should throw error for unknown billing cycle', () => {
    const scheduler = new SubscriptionScheduler();
    const testDate = new Date('2024-01-15');
    expect(() => (scheduler as any).getCronPattern('unknown', testDate))
      .toThrow('Unknown billing cycle: unknown');
  });
});