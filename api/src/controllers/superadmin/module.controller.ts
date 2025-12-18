import { Request, Response, NextFunction } from 'express';
import { prismaMaster } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';

// Lista de módulos disponíveis no sistema
export const AVAILABLE_MODULES = [
    { id: 'DASHBOARD', name: 'Dashboard Avançado', description: 'KPIs e gráficos em tempo real' },
    { id: 'PRODUCTS', name: 'Gestão de Produtos', description: 'Cadastro e controle de produtos' },
    { id: 'INVENTORY', name: 'Estoque', description: 'Controle de movimentações e saldo' },
    { id: 'SALES', name: 'Vendas', description: 'Gestão de pedidos e vendas' },
    { id: 'NFE', name: 'Emissão Fiscal', description: 'Emissão de NF-e e NFC-e' },
    { id: 'FINANCIAL', name: 'Financeiro', description: 'Contas a pagar e receber' },
    { id: 'AUDIT', name: 'Auditoria', description: 'Logs de ações dos usuários' },
    { id: 'ROUTES', name: 'Rotas de Entrega', description: 'Otimização de rotas' },
    { id: 'COMPLIANCE', name: 'Compliance', description: 'Conformidade regulatória' },
    { id: 'TEMPERATURE', name: 'Controle de Temperatura', description: 'Monitoramento termolábil' }
];

export class SuperadminModuleController {
    // Listar módulos disponíveis e seus status para um tenant
    static async listModules(req: Request, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.params;

            const tenant = await prismaMaster.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, modulesEnabled: true, plan: true }
            });

            if (!tenant) throw new AppError('Tenant não encontrado', 404);

            const enabledModules = (tenant.modulesEnabled as string[]) || [];

            // Combinar módulos disponíveis com status atual do tenant
            const modulesWithStatus = AVAILABLE_MODULES.map(module => ({
                ...module,
                enabled: enabledModules.includes(module.id)
            }));

            res.json({
                success: true,
                data: {
                    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
                    modules: modulesWithStatus
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // Ativar ou desativar um módulo para um tenant
    static async toggleModule(req: Request, res: Response, next: NextFunction) {
        try {
            const { tenantId } = req.params;
            const { moduleId, enabled } = req.body;

            if (!moduleId) throw new AppError('Module ID obrigatório', 400);

            // Verificar se módulo existe na lista
            const moduleExists = AVAILABLE_MODULES.find(m => m.id === moduleId);
            if (!moduleExists) throw new AppError('Módulo inválido', 400);

            const tenant = await prismaMaster.tenant.findUnique({
                where: { id: tenantId },
                select: { modulesEnabled: true }
            });

            if (!tenant) throw new AppError('Tenant não encontrado', 404);

            let modules = (tenant.modulesEnabled as string[]) || [];

            if (enabled) {
                // Adicionar se não existir
                if (!modules.includes(moduleId)) {
                    modules.push(moduleId);
                }
            } else {
                // Remover se existir
                modules = modules.filter(m => m !== moduleId);
            }

            await prismaMaster.tenant.update({
                where: { id: tenantId },
                data: { modulesEnabled: modules }
            });

            res.json({ success: true, message: `Módulo ${moduleId} ${enabled ? 'ativado' : 'desativado'} com sucesso` });
        } catch (err) {
            next(err);
        }
    }
}
