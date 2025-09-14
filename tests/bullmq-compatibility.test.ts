import { describe, it, expect } from 'bun:test';

describe('BullMQ Compatibility', () => {
  it('should have bullmq installed', () => {
    expect(() => {
      require('bullmq');
    }).not.toThrow();
  });

  it('should have the expected bullmq exports', () => {
    const bullmq = require('bullmq');
    
    // Check for main exports that should exist
    expect(bullmq.Queue).toBeDefined();
    expect(bullmq.Worker).toBeDefined();
    expect(bullmq.Job).toBeDefined();
    
    console.log('BullMQ version:', require('bullmq/package.json').version);
  });
});
