import { prisma } from '../config/database.js';

export interface LogActionParams {
  adminId?: number | null;
  actionType: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, any> | string;
  ipAddress?: string;
}

export async function logActivity(params: LogActionParams): Promise<void> {
  try {
    const detailsString =
      typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null;

    await prisma.activityLog.create({
      data: {
        adminId: params.adminId || null,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId ? String(params.entityId) : null,
        details: detailsString,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}
