#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const adminEmail = 'admin@farmaciademo.com.br';
const adminPassword = 'admin123';
const tenantDatabaseName = 'tenant_demo';

async function setupTenantDemo() {
  try {
    console.log('🔧 Setting up tenant demo database and user...');

    // Criar PrismaClient para tenant_demo
    const prismaTenant = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://postgres:postgres123@db:5432/${tenantDatabaseName}`
        }
      }
    });

    // Verificar se usuário já existe
    const existing = await prismaTenant.user.findUnique({
      where: { email: adminEmail.toLowerCase() }
    });

    if (existing) {
      console.log('✅ User already exists:', adminEmail);
      await prismaTenant.$disconnect();
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Criar usuário
    const user = await prismaTenant.user.create({
      data: {
        id: require('crypto').randomUUID(),
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        name: 'Demo Administrator',
        role: 'ADMIN',
        isActive: true,
        permissions: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Tenant Demo user created:', user.email);
    console.log('   Email:', user.email);
    console.log('   Senha: admin123');

    await prismaTenant.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

setupTenantDemo();
