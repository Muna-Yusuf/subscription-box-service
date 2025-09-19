import IORedis from 'ioredis';

// Create and export the connection instance directly
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 30000,
  commandTimeout: 30000,
});

export const getRedisConnection = () => {
  return redisConnection; // Return the existing instance
};

export const QUEUE_NAMES = {
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments', 
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = keyof typeof QUEUE_NAMES;
