import { prismaMaster } from '../lib/prisma.js';
import { subDays } from 'date-fns';

async function fixExpiredDate() {
  try {
    console.log('🔧 Atualizando data de expiração para 30 dias atrás...');

    const now = new Date();
    const expiredDate = subDays(now, 30);
    
    console.log(`Hoje: ${now.toLocaleString('pt-BR')}`);
    console.log(`Data de expiração (30 dias atrás): ${expiredDate.toLocaleString('pt-BR')}`);

    // Atualizar subscription
    const subscription = await prismaMaster.subscription.updateMany({
      where: {
        tenant: {
          cnpj: '12345678000155'
        }
      },
      data: {
        endDate: expiredDate,
        status: 'expired'
      }
    });

    console.log(`✅ Subscriptions atualizadas: ${subscription.count}`);

    // Atualizar tenant
    const tenant = await prismaMaster.tenant.updateMany({
      where: {
        cnpj: '12345678000155'
      },
      data: {
        subscriptionEnd: expiredDate,
        subscriptionStatus: 'expired'
      }
    });

    console.log(`✅ Tenants atualizados: ${tenant.count}`);

    // Verificar
    const updated = await prismaMaster.tenant.findUnique({
      where: { cnpj: '12345678000155' },
      include: {
        subscription: true
      }
    });

    console.log('\n✓ Verificação:');
    console.log(`  - Tenant ID: ${updated?.id}`);
    console.log(`  - Tenant Status: ${updated?.status}`);
    console.log(`  - Subscription Status: ${updated?.subscriptionStatus}`);
    console.log(`  - Subscription End: ${updated?.subscriptionEnd?.toLocaleString('pt-BR')}`);
    
    if (updated?.subscription) {
      console.log(`  - Subscription DB Status: ${updated.subscription.status}`);
      console.log(`  - Subscription DB EndDate: ${updated.subscription.endDate.toLocaleString('pt-BR')}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

fixExpiredDate().catch(console.error);
