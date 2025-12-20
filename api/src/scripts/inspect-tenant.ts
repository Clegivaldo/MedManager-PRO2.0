import { prismaMaster } from '../lib/prisma.js';

async function verify() {
    const cnpj = '12345678000195';
    const tenant = await prismaMaster.tenant.findUnique({
        where: { cnpj }
    });

    if (tenant) {
        console.log('--- TENANT DATA ---');
        console.log('ID:', tenant.id);
        console.log('CNPJ:', tenant.cnpj);
        console.log('Modules (raw):', tenant.modulesEnabled);
        console.log('Modules Type:', typeof tenant.modulesEnabled);
        console.log('Is Array:', Array.isArray(tenant.modulesEnabled));
        if (Array.isArray(tenant.modulesEnabled)) {
            console.log('Length:', tenant.modulesEnabled.length);
            console.log('Values:', JSON.stringify(tenant.modulesEnabled));
            console.log('Includes DASHBOARD:', tenant.modulesEnabled.includes('DASHBOARD'));
        }
    } else {
        console.log('Tenant not found');
    }
    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
