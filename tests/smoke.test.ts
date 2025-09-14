import { describe, it, expect } from 'bun:test';

describe('Smoke Tests', () => {
  it('should have test environment set up', () => {
    expect(process.env.NODE_ENV).toBe('test');
    console.log('Environment:', process.env.NODE_ENV);
  });

  it('should be able to import Bun modules', () => {
    expect(typeof Bun).toBe('object');
    // Bun.test might not be available in all versions
    expect(typeof Bun.serve).toBe('function'); // Test a different Bun method
  });

  it('should have basic Node.js modules available', () => {
    expect(typeof process).toBe('object');
    expect(typeof setTimeout).toBe('function');
    expect(typeof setInterval).toBe('function');
  });
});