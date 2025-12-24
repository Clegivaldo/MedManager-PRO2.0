require('dotenv').config({ path: '.env.test' });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERRO: Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.test');
  process.exit(1);
}

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@db:5432/medmanager_tenant_demo';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

async function testTenantLogin() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL,
      }
    }
  });

  try {
    console.log('🔍 Buscando usuário...');
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL.toLowerCase() }
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
    const isValid = await bcrypt.compare(TEST_USER_PASSWORD, user.password);
    console.log(`   Senha configurada em .env.test: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTenantLogin();
