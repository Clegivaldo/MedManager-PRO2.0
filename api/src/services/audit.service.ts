import { getTenantPrisma } from '../lib/tenant-prisma.js';
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
            const prisma = await getTenantPrisma(tenantId);
            await prisma.tenantAuditLog.create({
                data: {
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
        const prisma = await getTenantPrisma(tenantId);
        const { page, limit, userId, tableName, operation, startDate, endDate } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (userId) where.userId = userId;
        if (tableName) where.tableName = tableName;
        if (operation) where.operation = operation;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.tenantAuditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.tenantAuditLog.count({ where })
        ]);

        return {
            logs: logs.map((l: any) => ({
                ...l,
                userName: l.user?.name || 'Sistema'
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
        const prisma = await getTenantPrisma(tenantId);
        const log = await prisma.tenantAuditLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (log) {
            (log as any).userName = log.user?.name || 'Sistema';
        }

        return log;
    }
}

export const auditService = new AuditService();
