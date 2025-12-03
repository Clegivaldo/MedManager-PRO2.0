import { PrismaClient } from '@prisma/client';
import { AsaasService } from './api/src/services/payment/asaas.service.js';

const prisma = new PrismaClient();

async function syncCharge() {
  console.log('\n=== Sincronização Manual de Cobrança ===\n');
  
  const chargeId = 'pay_zt9oq9134xv30yvx';
  console.log(`Charge ID: ${chargeId}\n`);

  try {
    // 1. Verificar status ANTES
    const paymentBefore = await prisma.payment.findUnique({
      where: { gatewayChargeId: chargeId }
    });
    
    console.log('1️⃣  Status ANTES da sincronização:');
    console.log(`   Status: ${paymentBefore?.status}`);
    console.log(`   Tenant: ${paymentBefore?.tenantId}`);
    console.log(`   Valor: R$ ${parseFloat(paymentBefore?.amount.toString() || '0').toFixed(2)}`);

    // 2. Sincronizar
    const asaasService = new AsaasService(prisma);
    console.log('\n2️⃣  Sincronizando com Asaas...');
    const result = await asaasService.syncChargeStatus(chargeId);
    
    if (result.updated) {
      console.log('   ✅ Status foi atualizado!');
      console.log(`   Status anterior: ${result.previousStatus}`);
      console.log(`   Status novo: ${result.newStatus}`);
    } else {
      console.log('   ℹ️  Status já estava atualizado');
      console.log(`   Status atual: ${result.status}`);
    }

    // 3. Verificar status DEPOIS
    const paymentAfter = await prisma.payment.findUnique({
      where: { gatewayChargeId: chargeId }
    });
    
    console.log('\n3️⃣  Status DEPOIS da sincronização:');
    console.log(`   Status: ${paymentAfter?.status}`);

    console.log('\n✨ Sincronização concluída!\n');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

syncCharge();
