import { describe, it, expect } from 'bun:test';
import app from '../src/index';

describe('Route Order Debug', () => {
  it('should check route matching for /api/subscriptions/me', async () => {
    // Test the exact endpoint we're trying to reach
    const response = await app.request('/api/subscriptions/me', {
      method: 'GET',
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // This will help us see what's happening without auth
    expect(response.status).not.toBe(404); // Should not be "not found"
  });
});