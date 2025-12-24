import pkg from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import bcrypt from 'bcryptjs';

async function createTenantUser() {
  const tenantDbUrl = 'postgresql://postgres:postgres123@db:5432/e9675bde-126b-429a-a150-533e055e7cc0';
  
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
      where: { email: 'admin@farmaciademo.com.br' },
      update: {
        password: hashedPassword
      },
      create: {
        email: 'admin@farmaciademo.com.br',
        name: 'Admin Farmácia Demo',
        password: hashedPassword,
        role: 'MASTER',
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
