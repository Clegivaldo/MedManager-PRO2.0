import { prismaMaster } from '../lib/prisma.js';

async function fix() {
    const cnpj = '12345678000195';
    const tenant = await prismaMaster.tenant.findFirst({
        where: { OR: [{ cnpj }, { cnpj: cnpj.replace(/\D/g, '') }] }
    });

    if (tenant) {
        let modules = (tenant.modulesEnabled as string[]) || [];
        if (!modules.includes('DASHBOARD')) {
            modules.push('DASHBOARD');
            await prismaMaster.tenant.update({
                where: { id: tenant.id },
                data: { modulesEnabled: modules }
            });
            console.log('DASHBOARD module enabled successfully.');
        } else {
            console.log('DASHBOARD module was already enabled.');
        }
    } else {
        console.log(`Tenant with CNPJ ${cnpj} not found.`);
    }
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
