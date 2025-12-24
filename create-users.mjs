#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const tenants = [
  { cnpj: '00000000000001', email: 'admin@farmaciademo.com.br', password: 'admin123', name: 'Master Admin' },
  { cnpj: '12345678000195', email: 'admin@farmaciademo.com.br', password: 'admin123', name: 'Demo Admin' },
  { cnpj: '11223344000155', email: 'admin@drogaria.com', password: 'starter123', name: 'Starter Admin' }
];

async function createTenantUsers() {
  for (const tenant of tenants) {
    console.log(`\n🔧 Creating user for tenant: ${tenant.cnpj}`);
    
    const env = {
      ...process.env,
      TENANT_CNPJ: tenant.cnpj,
      USER_EMAIL: tenant.email,
      USER_PASSWORD: tenant.password,
      USER_NAME: tenant.name
    };

    return new Promise((resolve, reject) => {
      const child = spawn('docker', [
        'exec', 'backend',
        'node', 'dist/scripts/seed-tenant-user.js'
      ], { env, stdio: 'inherit' });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error(`❌ Failed to create user for tenant ${tenant.cnpj}`);
          // Continue anyway to create other users
        } else {
          console.log(`✅ User created for tenant ${tenant.cnpj}`);
        }
        
        // Create next user after current one finishes
        const nextTenant = tenants[tenants.indexOf(tenant) + 1];
        if (nextTenant) {
          createTenantUsers();
        } else {
          resolve();
        }
      });
    });
  }
}

createTenantUsers()
  .then(() => {
    console.log('\n✅ All tenant users created!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
