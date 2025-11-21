import { seedTenantUser } from './seed-tenant-user.js';

seedTenantUser().catch((err) => {
  console.error('Error running seedTenantUser:', err);
  process.exit(1);
});
