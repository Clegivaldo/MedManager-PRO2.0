import { prismaMaster } from '../lib/prisma.js';
import { hashPassword } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Script de inicialização para garantir que o usuário admin existe
 * Executado automaticamente na startup do container
 */
export async function initializeAdminUser() {
  try {
    logger.info('🔧 Initializing admin user...');
    const adminEmail = 'admin@medmanager.com.br';
    const adminPassword = 'admin123';

    // Verificar se usuário já existe
    const existingUser = await prismaMaster.user.findFirst({
      where: { email: adminEmail.toLowerCase() }
    });

    if (existingUser) {
      // Garantir papel SUPERADMIN caso já exista com outro papel
      if ((existingUser.role as any) !== 'SUPERADMIN') {
        await prismaMaster.user.update({
          where: { id: existingUser.id },
          data: { role: 'SUPERADMIN', isActive: true, updatedAt: new Date() }
        });
        logger.info('✅ Admin user role updated to SUPERADMIN');
      } else {
        logger.info('✅ Admin user already exists, skipping initialization');
      }
      return;
    }

    // Criar admin user
    const hashedPassword = await hashPassword(adminPassword);
    
    const adminUser = await prismaMaster.user.create({
      data: {
        id: randomUUID(),
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        name: 'System Administrator',
        role: 'SUPERADMIN',
        isActive: true,
        permissions: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.info('✅ Admin user initialized successfully', {
      email: adminUser.email,
      id: adminUser.id
    });

  } catch (error) {
    logger.error('Error initializing admin user:', error instanceof Error ? error.message : String(error));
    // Não falha a startup se o usuário já existe
    if (!(error instanceof Error && error.message.includes('Unique constraint'))) {
      throw error;
    }
  }
}
