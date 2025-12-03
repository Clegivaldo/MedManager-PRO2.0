#!/usr/bin/env node
import { execSync } from 'child_process';

try {
  console.log('🌱 Iniciando seed do banco de dados...');
  const result = execSync('docker exec backend sh -c "cd /app && npx tsx src/seed/master.seed.ts"', {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  console.log('✅ Seed completado com sucesso!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro ao executar seed:', error.message);
  process.exit(1);
}
