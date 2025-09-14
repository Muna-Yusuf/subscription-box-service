import { describe, it, expect } from 'bun:test';
import { existsSync } from 'fs';

describe('Application Structure Tests', () => {
  it('should have all required directories', () => {
    const directories = [
      './src',
      './src/db',
      './src/services', 
      './src/controllers',
      './src/config',
      './src/routes',
      './tests'
    ];

    directories.forEach(dir => {
      expect(existsSync(dir)).toBe(true);
    });
  });

  it('should have required database files', () => {
    const dbFiles = [
      './src/db/connection.ts',
      './src/db/schema.ts'
    ];

    dbFiles.forEach(file => {
      expect(existsSync(file)).toBe(true);
    });
  });

  it('should have required service files', () => {
    const serviceFiles = [
      './src/services/subscriptionService.ts',
      './src/services/orderService.ts',
      './src/services/schedulerService.ts'
    ];

    serviceFiles.forEach(file => {
      expect(existsSync(file)).toBe(true);
    });
  });

  it('should be able to import database connection', () => {
    expect(() => {
      require('../src/db/connection.ts');
    }).not.toThrow();
  });

  it('should be able to import schema', () => {
    expect(() => {
      require('../src/db/schema.ts');
    }).not.toThrow();
  });
});