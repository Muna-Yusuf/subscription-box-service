import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '../config/redis'; // Import from config
import { NotificationData } from '../services/notificationService.ts';

const redisConnection = getRedisConnection();

const notificationWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    const { userId, message, type, metadata }: NotificationData = job.data;
    
    console.log(`Processing notification for user ${userId}: ${type}`);
    console.log(`Message: ${message}`);
    
    if (metadata) {
      console.log(`Metadata:`, metadata);
    }

    // Simulate actual notification delivery
    const success = await sendActualNotification(userId, message, type, metadata);
    
    if (!success) {
      throw new Error(`Failed to send notification to user ${userId}`);
    }

    console.log(`Notification sent successfully to user ${userId}`);
    return { success: true, userId, type };
  },
  { 
    connection: redisConnection, 
    removeOnComplete: true, 
    removeOnFail: true,
    concurrency: 10 
  }
);

async function sendActualNotification(
  userId: number, 
  message: string, 
  type: string, 
  metadata?: Record<string, any>
): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Simulate 95% success rate for testing
  const success = Math.random() > 0.05;
  
  if (!success) {
    console.warn(`Simulated notification failure for user ${userId}`);
    return false;
  }
  
  return true;
}

notificationWorker.on('completed', (job) =>
  console.log(`Notification job ${job.id} completed for user ${job.data.userId}`)
);

notificationWorker.on('failed', (job, err) =>
  console.error(`Notification job ${job?.id} failed for user ${job?.data.userId}:`, err)
);

notificationWorker.on('error', (error) =>
  console.error('Notification worker error:', error)
);

const shutdown = async () => {
  console.log('Shutting down notification worker gracefully...');
  await notificationWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Notification worker started. Waiting for notification jobs...');