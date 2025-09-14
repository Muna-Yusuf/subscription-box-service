import { describe, it, expect } from 'bun:test';

describe('Basic Application Tests', () => {
  it('should have proper environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  it('should validate basic application structure', () => {
    // Test that key modules can be imported without errors
    expect(() => {
      require('../src/db/connection.ts');
    }).not.toThrow();

    expect(() => {
      require('../src/services/subscriptionService.ts');
    }).not.toThrow();

    expect(() => {
      require('../src/services/orderService.ts');
    }).not.toThrow();
  });

  it('should have required environment variables', () => {
    const requiredVars = ['NODE_ENV', 'JWT_SECRET'];
    requiredVars.forEach(varName => {
      expect(process.env[varName]).toBeDefined();
    });
  });
});