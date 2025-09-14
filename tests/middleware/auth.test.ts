import { describe, it, expect } from 'bun:test';
import { generateToken, verifyToken } from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  it('should generate and verify valid token', () => {
    const payload = { userId: 1, role: 'user' as const };
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    
    expect(decoded).toBeDefined();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.role).toBe(payload.role);
    // Check that token contains expected fields
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid-token');
    expect(decoded).toBeNull();
  });
});