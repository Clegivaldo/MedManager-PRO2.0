import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

interface AuditLogEntry {
    userId?: string;
    tableName: string;
    recordId?: string;
    operation: string;
    oldData?: any;
    newData?: any;
    ipAddress?: string;
    userAgent?: string;
}

interface ListLogsParams {
    page: number;
    limit: number;
    userId?: string;
    tableName?: string;
    operation?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Serviço de logs de auditoria
 */
class AuditService {
    /**
     * Registrar um log de auditoria
     */
    async log(tenantId: string, entry: AuditLogEntry) {
        try {
            await prismaMaster.auditLog.create({
                data: {
                    tenantId,
                    userId: entry.userId || null,
                    tableName: entry.tableName,
                    recordId: entry.recordId || null,
                    operation: entry.operation,
                    oldData: entry.oldData || null,
                    newData: entry.newData || null,
                    ipAddress: entry.ipAddress || null,
                    userAgent: entry.userAgent || null,
                }
            });
        } catch (error) {
            logger.error('Failed to create audit log:', error);
            // Non-blocking error
        }
    }

    /**
     * Listar logs de auditoria
     */
    async listLogs(tenantId: string, params: ListLogsParams) {
        const { page, limit, userId, tableName, operation, startDate, endDate } = params;
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (userId) where.userId = userId;
        if (tableName) where.tableName = tableName;
        if (operation) where.operation = operation;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prismaMaster.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prismaMaster.auditLog.count({ where })
        ]);

        return {
            logs: logs.map((l: any) => ({
                ...l,
                userName: 'Sistema' // User info not available in master DB
            })),
            total,
            page,
            limit,
        };
    }

    /**
     * Buscar detalhes de um log específico
     */
    async getLog(tenantId: string, id: string) {
        const log = await prismaMaster.auditLog.findFirst({
            where: { id, tenantId }
        });

        if (log) {
            (log as any).userName = 'Sistema'; // User info not available in master DB
        }

        return log;
    }
}

export const auditService = new AuditService();
