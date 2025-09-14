import { describe, it, expect, jest } from 'bun:test';
import { paymentService } from '@src/services/paymentService';

describe('Payment Service', () => {
  it('should simulate payment with random success', async () => {
    const result = await paymentService.simulatePayment(1);
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });

  it('should process subscription payment', async () => {
    const result = await paymentService.processSubscriptionPayment(1);
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });
});