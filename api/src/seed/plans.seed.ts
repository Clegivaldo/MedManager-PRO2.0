import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPlans() {
  console.log('🌱 Seeding plans...');

  const plans = [
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Ideal para pequenas distribuidoras iniciando operações',
      priceMonthly: 299.0,
      priceAnnual: 2990.0, // ~2 meses grátis
      maxUsers: 3,
      maxProducts: 1000,
      maxMonthlyTransactions: 500,
      maxStorageGb: 5,
      maxApiCallsPerMinute: 30,
      features: [
        'DASHBOARD',
        'PRODUCTS',
        'STOCK',
        'ORDERS',
        'CUSTOMERS',
        'COMPLIANCE',
      ],
      isActive: true,
      isHighlighted: false,
    },
    {
      name: 'professional',
      displayName: 'Professional',
      description: 'Para distribuidoras em crescimento com volume médio',
      priceMonthly: 799.0,
      priceAnnual: 7990.0,
      maxUsers: 10,
      maxProducts: 10000,
      maxMonthlyTransactions: 5000,
      maxStorageGb: 50,
      maxApiCallsPerMinute: 100,
      features: [
        'DASHBOARD',
        'PRODUCTS',
        'STOCK',
        'ORDERS',
        'CUSTOMERS',
        'COMPLIANCE',
        'NFE',
        'FINANCE',
        'ROUTES',
      ],
      isActive: true,
      isHighlighted: true, // RECOMENDADO
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Solução completa para grandes distribuidoras',
      priceMonthly: 2499.0,
      priceAnnual: 24990.0,
      maxUsers: 999999, // Ilimitado
      maxProducts: 999999,
      maxMonthlyTransactions: 999999,
      maxStorageGb: 500,
      maxApiCallsPerMinute: 300,
      features: [
        'DASHBOARD',
        'PRODUCTS',
        'STOCK',
        'ORDERS',
        'CUSTOMERS',
        'COMPLIANCE',
        'NFE',
        'FINANCE',
        'ROUTES',
        'BI',
        'AUTOMATION',
      ],
      isActive: true,
      isHighlighted: false,
    },
  ];

  for (const planData of plans) {
    const existingPlan = await prisma.plan.findUnique({
      where: { name: planData.name },
    });

    if (existingPlan) {
      console.log(`  ⏩ Plan "${planData.displayName}" already exists, updating...`);
      await prisma.plan.update({
        where: { name: planData.name },
        data: planData,
      });
    } else {
      console.log(`  ✅ Creating plan "${planData.displayName}"...`);
      await prisma.plan.create({
        data: planData,
      });
    }
  }

  console.log('✅ Plans seeded successfully!');
}

// Executar seed se chamado diretamente
seedPlans()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
