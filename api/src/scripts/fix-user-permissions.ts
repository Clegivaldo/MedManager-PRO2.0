import { PrismaClient } from '@prisma/client';
import { ROLES } from '../middleware/permissions.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

const prismaMaster = new PrismaClient({
  datasources: { db: { url: config.DATABASE_URL } }
});

/**
 * Script para corrigir permissões de usuários existentes
 */
async function fixUserPermissions() {
  try {
    console.log('🔧 Iniciando correção de permissões de usuários...');

    // Buscar todos os tenants ativos
    const tenants = await prismaMaster.tenant.findMany({
      where: { status: 'active' }
    });

    console.log(`📋 Encontrados ${tenants.length} tenants ativos`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.cnpj})`);
      
      const tenantDbUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${tenant.databaseName}`);
      const tenantPrisma = new PrismaClient({
        datasources: { db: { url: tenantDbUrl } }
      });

      try {
        // Buscar usuários com permissões vazias ou inválidas
        const users = await tenantPrisma.user.findMany();

        console.log(`   👥 Encontrados ${users.length} usuários`);

        for (const user of users) {
          const rawPerm = typeof user.permissions === 'string' 
            ? user.permissions 
            : JSON.stringify(user.permissions || []);
          
          const parsed = rawPerm ? JSON.parse(rawPerm) : [];

          if (parsed.length === 0) {
            const roleStr = String(user.role).toUpperCase();
            const roleKey = (Object.keys(ROLES) as Array<keyof typeof ROLES>).find(
              r => r.toUpperCase() === roleStr
            );

            if (roleKey) {
              const defaultPerms = ROLES[roleKey].permissions;
              
              await tenantPrisma.user.update({
                where: { id: user.id },
                data: { permissions: JSON.stringify(defaultPerms) }
              });

              console.log(`   ✅ Usuário ${user.email} (${user.role}): ${defaultPerms.length} permissões aplicadas`);
            } else {
              console.log(`   ⚠️  Usuário ${user.email} (${user.role}): Nenhum template de permissões encontrado`);
            }
          } else {
            console.log(`   ℹ️  Usuário ${user.email} (${user.role}): Já possui ${parsed.length} permissões`);
          }
        }
      } finally {
        await tenantPrisma.$disconnect();
      }
    }

    // Processar usuários do banco master (SUPERADMINs)
    console.log('\n🔐 Processando SUPERADMINs no banco master...');
    const masterUsers = await prismaMaster.user.findMany({
      where: { role: 'SUPERADMIN' }
    });

    console.log(`   👥 Encontrados ${masterUsers.length} superadmins`);

    for (const user of masterUsers) {
      const rawPerm = typeof user.permissions === 'string' 
        ? user.permissions 
        : JSON.stringify(user.permissions || []);
      
      const parsed = rawPerm ? JSON.parse(rawPerm) : [];

      if (parsed.length === 0) {
        const defaultPerms = ROLES.SUPERADMIN.permissions;
        
        await prismaMaster.user.update({
          where: { id: user.id },
          data: { permissions: JSON.stringify(defaultPerms) }
        });

        console.log(`   ✅ SUPERADMIN ${user.email}: ${defaultPerms.length} permissões aplicadas`);
      } else {
        console.log(`   ℹ️  SUPERADMIN ${user.email}: Já possui ${parsed.length} permissões`);
      }
    }

    console.log('\n✅ Correção de permissões concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao corrigir permissões:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
fixUserPermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
