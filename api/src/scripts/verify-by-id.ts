import { prismaMaster } from '../lib/prisma.js';

async function verify() {
    const id = 'e9675bde-126b-429a-a150-533e055e7cc0';
    const tenant = await prismaMaster.tenant.findUnique({
        where: { id }
    });

    if (tenant) {
        console.log('--- TENANT DATA BY ID ---');
        console.log('ID:', tenant.id);
                console.log('CNPJ:', tenant.cnpj);
                console.log('DB:', {
                    databaseName: tenant.databaseName,
                    databaseUser: tenant.databaseUser,
                    databasePassword: tenant.databasePassword
                });
                console.log('Modules:', tenant.modulesEnabled);
    } else {
        console.log('Tenant not found by ID:', id);
    }
    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
