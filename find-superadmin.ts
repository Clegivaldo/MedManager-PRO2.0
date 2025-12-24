/**
 * Script: Verificar qual usuário é superadmin no sistema
 * Uso: npx tsx find-superadmin.ts
 * ⚠️ Carrega credenciais de .env.test (NUNCA hardcode)
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.test' });

const API_URL = 'http://localhost:3333/api/v1';

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD || !process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
  console.error('❌ ERRO: Configure TEST_USER_EMAIL, TEST_USER_PASSWORD, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD no .env.test');
  process.exit(1);
}

// Tentar apenas credenciais fornecidas via ambiente (sem defaults inseguros)
const USERS_TO_TRY = [
  { email: process.env.TEST_USER_EMAIL!, password: process.env.TEST_USER_PASSWORD!, name: 'Admin (.env.test)' },
  { email: process.env.SUPERADMIN_EMAIL!, password: process.env.SUPERADMIN_PASSWORD!, name: 'Superadmin (.env.test)' },
];

async function tryLogin(email: string, password: string, name: string) {
  try {
    console.log(`\n🔐 Tentando: ${name} (${email})...`);
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const user = res.data.data?.user;
    const token = res.data.data?.tokens?.accessToken || res.data.data?.accessToken;
    
    console.log(`✓ Login bem-sucedido!`);
    console.log(`  Email: ${user?.email}`);
    console.log(`  Role: ${user?.role}`);
    console.log(`  Tenant ID: ${user?.tenantId || 'N/A'}`);
    console.log(`  Token: ${token?.substring(0, 50)}...`);
    
    // Testar se é superadmin tentando acessar rota protegida
    if (token) {
      try {
        const payRes = await axios.get(`${API_URL}/superadmin/payment-providers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`  ✓ Acesso a /superadmin confirmado!`);
      } catch (e: any) {
        console.log(`  ✗ Sem acesso ao /superadmin (${e.response?.status})`);
      }
    }
    
    return { success: true, email, password, name, user, token };
  } catch (err: any) {
    console.log(`✗ Falhou: ${err.response?.data?.error || err.message}`);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 PROCURANDO USUÁRIO SUPERADMIN');
  console.log('═══════════════════════════════════════════════════════');

  for (const user of USERS_TO_TRY) {
    const result = await tryLogin(user.email, user.password, user.name);
    if (result?.token) {
      console.log('\n✅ ENCONTRADO! Use as credenciais acima para testes.');
      console.log('\n⚠️  IMPORTANTE: Configure as credenciais no arquivo .env.test');
      console.log('\nComando para test-asaas-integration.ts:');
      console.log(`  npx tsx test-asaas-integration.ts`);
      console.log('\n📝 Exemplo de .env.test:');
      console.log(`  SUPERADMIN_EMAIL=${result.email}`);
      console.log(`  SUPERADMIN_PASSWORD=<sua_senha_segura>`);
      process.exit(0);
    }
  }

  console.log('\n❌ Nenhum usuário superadmin encontrado com credenciais conhecidas.');
  console.log('Por favor, verifique o banco de dados ou use credenciais diferentes.');
}

main();
