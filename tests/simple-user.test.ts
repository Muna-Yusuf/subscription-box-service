import { describe, it, expect } from 'bun:test';
import { db } from '../src/db/connection.ts';
import { users } from '../src/db/schema.ts';

describe('Simple User Test', () => {
  it('should create a user directly in database', async () => {
    const userData = {
      email: 'direct@example.com',
      password: 'direct123',
      firstName: 'Direct',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const [user] = await db.insert(users).values(userData).returning();
      expect(user.email).toBe('direct@example.com');
      expect(user.firstName).toBe('Direct');
      console.log('Direct user creation successful');
    } catch (error) {
      console.log('Direct user creation error:', error.message);
      throw error;
    }
  });
});
