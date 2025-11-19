import { prismaMaster } from '../lib/prisma.js';
import { logger } from './logger.js';

export interface AuditLogData {
  tenantId: string;
  userId?: string;
  tableName: string;
  recordId?: string;
  operation: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(data: AuditLogData) {
  try {
    await prismaMaster.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        tableName: data.tableName,
        recordId: data.recordId,
        operation: data.operation,
        oldData: data.oldData || null,
        newData: data.newData || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error, data });
  }
}