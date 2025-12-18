import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import bcrypt from 'bcryptjs';

async function createTenantUser() {
  const tenantDbUrl = 'postgresql://postgres:postgres123@db:5432/medmanager_tenant_demo';
  
  const prisma = new PrismaClientRuntime({
    datasources: {
      db: {
        url: tenantDbUrl
      }
    }
  });

  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'admin@farmaciademo.com' },
      update: {
        password: hashedPassword
      },
      create: {
        email: 'admin@farmaciademo.com',
        name: 'Admin Farmácia Demo',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Usuário do tenant criado/atualizado:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Senha: admin123`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTenantUser();
