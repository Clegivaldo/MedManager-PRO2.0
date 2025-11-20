import { prismaMaster } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function createNormalUser() {
  try {
    console.log('👤 Criando usuário de teste (login master /auth/login)...');

    // Email e senha esperados pelo script de teste completo
    const email = 'admin@farmaciademo.com';
    const passwordPlain = 'admin123';

    // Verificar existência
    const existing = await prismaMaster.user.findUnique({ where: { email } });
    if (existing) {
      console.log('ℹ️ Usuário já existe, atualizando senha para estado conhecido...');
      const newHash = await bcrypt.hash(passwordPlain, 10);
      await prismaMaster.user.update({
        where: { id: existing.id },
        data: { password: newHash, isActive: true }
      });
      console.log('✅ Usuário atualizado:');
      console.log(`   Email: ${email}`);
      console.log(`   Senha: ${passwordPlain}`);
      console.log(`   Role: ${existing.role}`);
      return;
    }

    const hash = await bcrypt.hash(passwordPlain, 10);
    const user = await prismaMaster.user.create({
      data: {
        email,
        name: 'Admin Farmácia Demo (Master)',
        password: hash,
        role: 'SUPERADMIN',
        isActive: true,
        permissions: []
      }
    });

    console.log('✅ Usuário criado com sucesso:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Senha: ${passwordPlain}`);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

createNormalUser().catch(console.error);
