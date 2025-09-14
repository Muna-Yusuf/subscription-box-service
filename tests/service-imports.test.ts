import { describe, it, expect } from 'bun:test';

describe('Service Import Tests', () => {
  it('should import subscription service', () => {
    expect(() => {
      require('../src/services/subscriptionService.ts');
    }).not.toThrow();
  });

  it('should import order service', () => {
    expect(() => {
      require('../src/services/orderService.ts');
    }).not.toThrow();
  });

  it('should import scheduler service without BullMQ errors', () => {
    // This test verifies that the services can be imported without immediate errors
    expect(() => {
      require('../src/services/schedulerService.ts');
    }).not.toThrow();
  });
});
