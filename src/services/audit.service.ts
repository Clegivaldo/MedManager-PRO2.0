// src/services/audit.service.ts
import api from './api';

export interface AuditLog {
    id: string;
    userId: string | null;
    userName?: string;
    tableName: string;
    recordId: string | null;
    operation: string;
    oldData: any;
    newData: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}

export interface AuditLogsResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

class AuditService {
    /**
     * Listar logs de auditoria com filtros
     */
    async listLogs(params?: {
        page?: number;
        limit?: number;
        userId?: string;
        tableName?: string;
        operation?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<AuditLogsResponse> {
        const response = await api.get('/audit/logs', { params });
        return response.data;
    }

    /**
     * Buscar detalhes de um log específico
     */
    async getLog(id: string): Promise<AuditLog> {
        const response = await api.get(`/audit/logs/${id}`);
        return response.data.data;
    }
}

export default new AuditService();
