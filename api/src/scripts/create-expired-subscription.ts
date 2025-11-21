import { prismaMaster } from '../lib/prisma.js';
import { subDays } from 'date-fns';
import fs from 'fs';
import path from 'path';

/**
 * Script para criar uma assinatura expirada para teste
 * Uso: npx tsx src/scripts/create-expired-subscription.ts
 */

async function createExpiredSubscription() {
  try {
    console.log('🚀 Criando assinatura expirada para testes...');

    // Obter plano Starter
    const plan = await prismaMaster.plan.findUnique({
      where: { name: 'starter' },
    });

    if (!plan) {
      console.error('❌ Plano Starter não encontrado. Execute seed primeiro.');
      return;
    }

    console.log(`✓ Plano Starter encontrado: ${plan.displayName}`);

    // Obter primeiro tenant (se não existir, criar um de teste)
    let tenant = await prismaMaster.tenant.findFirst({
      where: { status: 'active' },
    });

    if (!tenant) {
      console.log('⚠️ Nenhum tenant encontrado. Criando tenant de teste...');
      tenant = await prismaMaster.tenant.create({
        data: {
          name: 'Tenant Teste com Licença Expirada',
          cnpj: '12345678000199',
          databaseName: 'tenant_test_expired',
          databaseUser: 'test_expired_user',
          databasePassword: 'test_expired_pass_123',
          plan: 'starter',
          status: 'active',
          subscriptionStatus: 'expired',
        },
      });
      console.log(`✓ Tenant criado: ${tenant.name} (${tenant.cnpj})`);
    } else {
      console.log(`✓ Tenant encontrado: ${tenant.name} (${tenant.cnpj})`);
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
        startDate: subDays(expiredDate, 30), // 60 dias atrás
        endDate: expiredDate, // 30 dias atrás (expirada)
        status: 'expired',
        billingCycle: 'monthly',
        autoRenew: false,
      },
      include: {
        plan: true,
        tenant: true,
      },
    });

    // Atualizar tenant com datas de expiração (mas manter status como 'active' para teste)
    await prismaMaster.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStart: subscription.startDate,
        subscriptionEnd: subscription.endDate,
        subscriptionStatus: 'expired',
        // NÃO alterar o status geral do tenant, pois isso bloqueia acesso geral
        // status: 'suspended', // Comentar para manter acesso
      },
    });

    console.log('✅ Assinatura expirada criada com sucesso!');
    console.log(`
    📋 Detalhes da Assinatura:
    - Tenant: ${tenant.name}
    - CNPJ: ${tenant.cnpj}
    - Plano: ${plan.displayName}
    - Data de Início: ${subscription.startDate.toLocaleDateString('pt-BR')}
    - Data de Fim: ${subscription.endDate.toLocaleDateString('pt-BR')} (EXPIRADA)
    - Status: ${subscription.status}
    - Auto-Renovar: ${subscription.autoRenew ? 'Sim' : 'Não'}
    `);

    // Persistir tenantId e CNPJ em arquivo para consumo pelos testes E2E
    try {
      // Gerar sempre na raiz do projeto (um nível acima de /api)
      const outputPath = path.resolve(process.cwd(), '../tenant-expired.json');
      const outputData = {
        tenantId: tenant.id,
        cnpj: tenant.cnpj,
        name: tenant.name,
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`📝 Arquivo gerado na raiz do projeto: ${outputPath}`);
    } catch (fileErr) {
      console.error('⚠️ Falha ao escrever tenant-expired.json:', fileErr);
    }

    console.log('✅ Seed concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar assinatura expirada:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar se chamado diretamente
createExpiredSubscription()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
