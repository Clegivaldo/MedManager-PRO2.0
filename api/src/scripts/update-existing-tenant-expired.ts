import { prismaMaster } from '../lib/prisma.js';
import { subDays } from 'date-fns';
import fs from 'fs';
import path from 'path';

/**
 * Script para atualizar tenant existente (12345678000195) com assinatura expirada
 */

async function updateTenantExpired() {
  try {
    console.log('🚀 Atualizando tenant existente para estado expirado...');

    // Buscar tenant com CNPJ 12345678000195
    const tenant = await prismaMaster.tenant.findFirst({
      where: { cnpj: '12345678000195' },
    });

    if (!tenant) {
      console.error('❌ Tenant 12345678000195 não encontrado!');
      process.exit(1);
    }

    console.log(`✓ Tenant encontrado: ${tenant.name}`);

    // Obter plano Starter
    const plan = await prismaMaster.plan.findUnique({
      where: { name: 'starter' },
    });

    if (!plan) {
      console.error('❌ Plano Starter não encontrado!');
      process.exit(1);
    }

    // Deletar assinatura anterior se existir
    const existingSubscription = await prismaMaster.subscription.findUnique({
      where: { tenantId: tenant.id },
    });

    if (existingSubscription) {
      await prismaMaster.subscription.delete({
        where: { tenantId: tenant.id },
      });
      console.log('✓ Assinatura anterior deletada');
    }

    // Criar assinatura expirada (30 dias atrás)
    const expiredDate = subDays(new Date(), 30);
    const subscription = await prismaMaster.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        startDate: subDays(expiredDate, 30),
        endDate: expiredDate,
        status: 'expired',
        billingCycle: 'monthly',
        autoRenew: false,
      },
    });

    // Atualizar tenant com status expirado
    await prismaMaster.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStart: subscription.startDate,
        subscriptionEnd: subscription.endDate,
        subscriptionStatus: 'expired',
      },
    });

    // Salvar info no arquivo
    const outputPath = path.resolve(process.cwd(), '../tenant-expired.json');
    const outputData = {
      tenantId: tenant.id,
      cnpj: tenant.cnpj,
      name: tenant.name,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

    console.log('✅ Tenant atualizado com assinatura expirada!');
    console.log(`
    📋 Detalhes:
    - Tenant ID: ${tenant.id}
    - CNPJ: ${tenant.cnpj}
    - Nome: ${tenant.name}
    - Status Assinatura: expired
    - Data Expiração: ${subscription.endDate.toLocaleDateString('pt-BR')}
    `);
    console.log(`📝 Arquivo atualizado: ${outputPath}`);

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prismaMaster.$disconnect();
  }
}

updateTenantExpired();
