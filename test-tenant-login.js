const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testTenantLogin() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres123@db:5432/medmanager_tenant_demo'
      }
    }
  });

  try {
    console.log('🔍 Buscando usuário...');
    const user = await prisma.user.findUnique({
      where: { email: 'admin@farmaciademo.com' }
    });

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('✅ Usuário encontrado:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ativo: ${user.isActive}`);

    console.log('\n🔐 Testando senha...');
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log(`   Senha 'admin123': ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTenantLogin();
