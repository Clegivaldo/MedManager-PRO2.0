import { Request, Response } from 'express';
import { financialService } from '../services/financial.service.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const createTransactionSchema = z.object({
    type: z.enum(['RECEIVABLE', 'PAYABLE']),
    description: z.string().min(3),
    value: z.number().positive(),
    dueDate: z.string(),
    category: z.string().optional(),
    client: z.string().optional(),
    supplier: z.string().optional(),
});

/**
 * Controller para gerenciamento financeiro
 */
class FinancialController {
    /**
     * Buscar resumo financeiro
     */
    getSummary = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const summary = await financialService.getSummary(tenantId);

            return res.json({
                success: true,
                data: summary,
            });
        } catch (error) {
            logger.error('Error fetching financial summary:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar resumo financeiro',
            });
        }
    };

    /**
     * Listar transações
     */
    listTransactions = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const { page = 1, limit = 10, type, status, startDate, endDate } = req.query;

            const result = await financialService.listTransactions(tenantId, {
                page: Number(page),
                limit: Number(limit),
                type: type as any,
                status: status as string,
                startDate: startDate as string,
                endDate: endDate as string,
            });

            return res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            logger.error('Error listing transactions:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao listar transações',
            });
        }
    };

    /**
     * Buscar dados de fluxo de caixa
     */
    getCashFlow = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const { startDate, endDate } = req.query;

            const cashFlow = await financialService.getCashFlow(tenantId, {
                startDate: startDate as string,
                endDate: endDate as string,
            });

            return res.json({
                success: true,
                data: cashFlow,
            });
        } catch (error) {
            logger.error('Error fetching cash flow:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar fluxo de caixa',
            });
        }
    };

    /**
     * Criar nova transação
     */
    createTransaction = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            // Validar dados
            const validationResult = createTransactionSchema.safeParse(req.body);

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados inválidos',
                    errors: validationResult.error.errors,
                });
            }

            const transaction = await financialService.createTransaction(
                tenantId,
                validationResult.data
            );

            logger.info(`Transaction created for tenant ${tenantId}`);

            return res.status(201).json({
                success: true,
                data: transaction,
                message: 'Transação criada com sucesso',
            });
        } catch (error) {
            logger.error('Error creating transaction:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar transação',
            });
        }
    };

    /**
     * Atualizar transação
     */
    updateTransaction = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            const transaction = await financialService.updateTransaction(
                tenantId,
                id,
                req.body
            );

            return res.json({
                success: true,
                data: transaction,
                message: 'Transação atualizada com sucesso',
            });
        } catch (error) {
            logger.error('Error updating transaction:', error);

            if (error instanceof Error && error.message === 'Transaction not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Transação não encontrada',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar transação',
            });
        }
    };

    /**
     * Marcar transação como paga
     */
    markAsPaid = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;
            const { paymentDate } = req.body;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            await financialService.markAsPaid(tenantId, id, paymentDate);

            return res.json({
                success: true,
                message: 'Transação marcada como paga',
            });
        } catch (error) {
            logger.error('Error marking transaction as paid:', error);

            if (error instanceof Error && error.message === 'Transaction not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Transação não encontrada',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Erro ao atualizar transação',
            });
        }
    };

    /**
     * Cancelar transação
     */
    cancelTransaction = async (req: Request, res: Response) => {
        try {
            const tenantId = req.user?.tenantId;
            const { id } = req.params;

            if (!tenantId) {
                return res.status(401).json({
                    success: false,
                    message: 'Tenant não identificado',
                });
            }

            await financialService.cancelTransaction(tenantId, id);

            return res.json({
                success: true,
                message: 'Transação cancelada com sucesso',
            });
        } catch (error) {
            logger.error('Error canceling transaction:', error);

            if (error instanceof Error && error.message === 'Transaction not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Transação não encontrada',
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Erro ao cancelar transação',
            });
        }
    };
}

export const financialController = new FinancialController();
