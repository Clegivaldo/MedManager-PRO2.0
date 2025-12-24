/**
 * Script: Listar todos os tenants disponíveis
 * Uso: npx tsx list-tenants.ts
 */

import axios from 'axios';

const API_URL = 'http://localhost:3333/api/v1';

async function main() {
  try {
    console.log('🔐 Fazendo login como superadmin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@farmaciademo.com.br',
      password: 'admin123'
    });
    const token = loginRes.data.data?.tokens?.accessToken;
    
    console.log('✓ Login bem-sucedido\n');
    
    console.log('📋 Buscando tenants...');
    const tenantsRes = await axios.get(`${API_URL}/superadmin/tenants?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const tenants = tenantsRes.data.tenants;
    console.log(`\nFound ${tenants.length} tenants:\n`);
    
    tenants.forEach((t: any, i: number) => {
      console.log(`${i + 1}. ${t.name}`);
      console.log(`   ID: ${t.id}`);
      console.log(`   CNPJ: ${t.cnpj}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Plan: ${t.plan}`);
      console.log('');
    });
    
  } catch (err: any) {
    console.error('❌ Erro:', err.response?.data || err.message);
  }
}

main();
