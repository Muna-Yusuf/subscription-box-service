import { describe, it, expect } from 'bun:test';
import router from '../src/routes/router.ts';
import jwt from 'jsonwebtoken';

function generateTestToken(role = 'admin') {
}

describe('Debug User Creation', () => {
  it('should debug user creation', async () => {
    const userData = {
      email: 'debug@example.com',
      password: 'debug123',
      firstName: 'Debug',
      lastName: 'User'
    };

    console.log('Sending user creation request...');
    
    const response = await router.request('/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${generateTestToken()}`
      },
      body: JSON.stringify(userData),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      const body = await response.text();
      console.log('Response body:', body);
    } catch (error) {
      console.log('Error reading response body:', error);
    }
  });
});
