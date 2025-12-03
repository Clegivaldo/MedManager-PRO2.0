import { Request, Response } from 'express';
import { auditService } from '../services/audit.service.js';
import { logger } from '../utils/logger.js';

/**
 * Controller para logs de auditoria
 */
class AuditController {
    /**
     * Listar logs de auditoria
     */
    listLogs = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const {
                page = 1,
                limit = 20,
                userId,
                tableName,
                operation,
                startDate,
                endDate
            } = req.query;

            const result = await auditService.listLogs(tenantId, {
                page: Number(page),
                limit: Number(limit),
                userId: userId as string,
                tableName: tableName as string,
                operation: operation as string,
                startDate: startDate as string,
                endDate: endDate as string,
            });

            return res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            logger.error('Error listing audit logs:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao listar logs de auditoria',
            });
        }
    };

    /**
     * Buscar detalhes de um log
     */
    getLog = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const log = await auditService.getLog(tenantId, id);

            if (!log) {
                return res.status(404).json({
                    success: false,
                    message: 'Log não encontrado',
                });
            }

            return res.json({
                success: true,
                data: log,
            });
        } catch (error) {
            logger.error('Error fetching audit log:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar log',
            });
        }
    };
}

export const auditController = new AuditController();
