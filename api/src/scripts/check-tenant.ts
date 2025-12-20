import { prismaMaster } from '../lib/prisma.js';

async function check() {
    const cnpj = '12345678000195';
    const tenant = await prismaMaster.tenant.findFirst({
        where: { OR: [{ cnpj }, { cnpj: cnpj.replace(/\D/g, '') }] }
    });

    if (tenant) {
        console.log('Tenant Found:');
        console.log(`Name: ${tenant.name}`);
        console.log(`CNPJ: ${tenant.cnpj}`);
        console.log(`Plan: ${tenant.plan}`);
        console.log(`Modules Enabled: ${JSON.stringify(tenant.modulesEnabled)}`);
    } else {
        console.log(`Tenant with CNPJ ${cnpj} not found.`);
    }
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
