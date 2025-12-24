/**
 * Script: Verificar qual usuário é superadmin no sistema
 * Uso: npx tsx find-superadmin.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3333/api/v1';

// Tentar vários usuários conhecidos
const USERS_TO_TRY = [
  { email: 'admin@farmaciademo.com.br', password: 'admin123', name: 'Admin Farmácia Demo' },
  { email: 'superadmin@medmanager.com', password: 'superadmin123', name: 'Superadmin' },
  { email: 'super@admin.com', password: 'super123', name: 'Super Admin 2' },
  { email: 'admin@medmanager.com.br', password: 'admin123', name: 'Admin MedManager' },
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
      console.log('\nComando para test-asaas-integration.ts:');
      console.log(`  npx tsx test-asaas-integration.ts --email="${result.email}" --password="${result.password}"`);
      process.exit(0);
    }
  }

  console.log('\n❌ Nenhum usuário superadmin encontrado com credenciais conhecidas.');
  console.log('Por favor, verifique o banco de dados ou use credenciais diferentes.');
}

main();
