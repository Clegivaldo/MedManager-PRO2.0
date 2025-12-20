import { prismaMaster } from '../lib/prisma.js';
import { LimitsService } from '../services/limits.service.js';

async function main() {
    const tenantId = process.argv[2];
    if (!tenantId) {
        console.log('Uso: npx tsx src/scripts/test-limits.ts <tenantId>');
        const tenants = await prismaMaster.tenant.findMany({ take: 5 });
        console.log('Tenants disponíveis:', tenants.map(t => ({ id: t.id, name: t.name })));
        return;
    }

    const limitsService = new LimitsService(prismaMaster);

    try {
        const dashboard = await limitsService.getUsageDashboard(tenantId);
        console.log('=== DASHBOARD DE LIMITES ===');
        console.log(JSON.stringify(dashboard, null, 2));
    } catch (e) {
        console.error('Erro ao buscar dashboard:', (e as Error).message);
    }
}

main().catch(console.error);
