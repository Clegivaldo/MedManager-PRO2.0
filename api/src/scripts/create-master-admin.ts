import { prismaMaster } from '../lib/prisma.js';
import { hashPassword } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';

/**
 * Script para criar usuário admin no banco mestre
 */
async function createMasterAdmin() {
  try {
    console.log('🔍 Verificando se master admin já existe...');
    logger.info('Creating master admin user...');

    // Verificar se já existe usuário admin
    const existingUser = await prismaMaster.user.findUnique({
      where: { email: 'admin@medmanager.com.br' }
    });

    if (existingUser) {
      console.log('✅ Master admin já existe!');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Nome: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Ativo: ${existingUser.isActive}`);
      logger.info('Master admin user already exists');
      return;
    }

    console.log('🆕 Criando novo master admin...');
    
    // Criar usuário admin
    const adminUser = await prismaMaster.user.create({
      data: {
        email: 'admin@medmanager.com.br',
        name: 'Master Admin',
        password: await hashPassword('admin123'),
        role: UserRole.SUPERADMIN,
        isActive: true,
        permissions: []
      }
    });

    console.log('✅ Master admin criado com sucesso!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   ID: ${adminUser.id}`);
    logger.info(`Master admin user created: ${adminUser.email}`);
  } catch (error) {
    console.error('❌ Erro ao criar master admin:', error);
    logger.error('Error creating master admin:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
createMasterAdmin()
  .then(() => {
    console.log('✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro no script:', error);
    process.exit(1);
  });