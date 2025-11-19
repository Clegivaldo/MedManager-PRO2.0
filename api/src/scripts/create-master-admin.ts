import { prismaMaster } from '../lib/prisma.js';
import { hashPassword } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';

/**
 * Script para criar usuário admin no banco mestre
 */
async function createMasterAdmin() {
  try {
    logger.info('Creating master admin user...');

    // Verificar se já existe usuário admin
    const existingUser = await prismaMaster.user.findUnique({
      where: { email: 'admin@medmanager.com.br' }
    });

    if (existingUser) {
      logger.info('Master admin user already exists');
      return;
    }

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

    logger.info(`Master admin user created: ${adminUser.email}`);
  } catch (error) {
    logger.error('Error creating master admin:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
if (import.meta.url === `file://${process.argv[1]}`) {
  createMasterAdmin()
    .then(() => {
      console.log('✅ Master admin created successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error creating master admin:', error);
      process.exit(1);
    });
}