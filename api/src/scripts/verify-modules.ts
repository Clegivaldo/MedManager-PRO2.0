import { prismaMaster } from '../lib/prisma.js';

async function verify() {
    const cnpj = '12345678000195';
    const tenant = await prismaMaster.tenant.findFirst({
        where: { OR: [{ cnpj }, { cnpj: cnpj.replace(/\D/g, '') }] }
    });

    if (tenant) {
        const modules = tenant.modulesEnabled;
        console.log(`FULL_MODULE_LIST: ${JSON.stringify(modules)}`);
        console.log(`Contains DASHBOARD: ${Array.isArray(modules) && modules.includes('DASHBOARD')}`);
    } else {
        console.log('Tenant not found');
    }
    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
