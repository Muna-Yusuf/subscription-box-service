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
      userId: event.userId ?? null,
      action: event.action,
      entity: event.resourceType,
      entityId: String(event.resourceId),
      details: event.details ? JSON.stringify(event.details) : null,
      status: event.status,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

export const auditService = new AuditService();
