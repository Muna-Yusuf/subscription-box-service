import { describe, it, expect } from 'bun:test';

describe('BullMQ Usage in App', () => {
  it('should check how BullMQ is imported in scheduler service', () => {
    const schedulerCode = require('fs').readFileSync('/app/src/services/schedulerService.ts', 'utf8');
    
    // Check import style
    expect(schedulerCode).toContain('bullmq');
    console.log('BullMQ import found in scheduler service');
  });

  it('should check BullMQ version compatibility', () => {
    const bullmq = require('bullmq');
    console.log('BullMQ available exports:', Object.keys(bullmq).filter(key => !key.startsWith('_')));
    
    // Check if QueueScheduler exists
    const hasQueueScheduler = 'QueueScheduler' in bullmq;
    console.log('Has QueueScheduler:', hasQueueScheduler);
    
    if (!hasQueueScheduler) {
      console.log('QueueScheduler not found - may be using different BullMQ version');
    }
  });
});