import { describe, it, expect } from 'bun:test';
import app from '../src/index';

describe('Route Matching Debug', () => {
  it('should check which route matches /api/subscriptions/me', async () => {
    // Add a query parameter to make the URL unique for debugging
    const response = await app.request('/api/subscriptions/me?debug=1', {
      method: 'GET',
    });
    
    console.log('Response status:', response.status);
    
    // The response should tell us which route was matched
    if (response.status === 401) {
      console.log('Route was matched but requires auth');
    } else if (response.status === 404) {
      console.log('No route matched');
    } else {
      console.log('Unexpected response:', response.status);
    }
  });

  it('should check which route matches /api/subscriptions/123', async () => {
    const response = await app.request('/api/subscriptions/123?debug=2', {
      method: 'GET',
    });
    
    console.log('Response status for /123:', response.status);
  });
});