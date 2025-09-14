import { db } from '../db/connection';
import { auditLogs } from '../db/schema';

export class AuditService {
  async logEvent(event: {
    userId?: number;
    action: string;
    resourceType: string;
    resourceId: number;
    details?: any;
    status: 'success' | 'failure';
  }) {
    await db.insert(auditLogs).values({
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      details: event.details,
      status: event.status,
      timestamp: new Date(),
    });
  }
}

export const auditService = new AuditService();