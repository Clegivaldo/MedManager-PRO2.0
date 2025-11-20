import { seedTestEnvironment } from '../src/scripts/seed-test-env.js';
import { prismaMaster } from '../src/lib/prisma.js';

// Garantir flag de simulação para NF-e
process.env.ALLOW_NFE_SIMULATION = 'true';

// Seed antes dos testes E2E
await seedTestEnvironment();

// Desconectar após seed (Vitest manterá conexões usadas pelos testes se necessário)
await prismaMaster.$disconnect();