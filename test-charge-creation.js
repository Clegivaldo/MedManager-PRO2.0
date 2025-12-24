// ⚠️ ATENÇÃO: Carregar credenciais de .env.test
require('dotenv').config({ path: '.env.test' });

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERRO: Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.test');
  process.exit(1);
}


#!/usr/bin/env node

/**
 * Test script to verify charge creation for tenant
 */

const tenantId = '61d9ab5b-2678-4bab-8ccf-a57c6e16b5f2'; // Tenant Teste com Licença Expirada
const apiUrl = 'http://localhost:3333/api/v1';

async function testCreateCharge() {
  try {
    console.log('🧪 Testing charge creation for tenant...\n');
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`API: ${apiUrl}\n`);

    // Get auth token first
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@medmanager.com.br',
        password: process.env.TEST_USER_PASSWORD || 'admin123'
      })
    });

    if (!loginRes.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.tokens?.accessToken;

    if (!token) {
      throw new Error('No token in response');
    }

    console.log('✅ Authenticated\n');

    // Create charge
    const chargeRes = await fetch(
      `${apiUrl}/superadmin/tenants/${tenantId}/create-charge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 50.00,
          paymentMethod: 'PIX',
          description: 'Teste de cobrança',
          billingCycle: 'monthly'
        })
      }
    );

    const chargeData = await chargeRes.json();

    if (chargeRes.ok) {
      console.log('✅ SUCESSO! Cobrança criada:\n');
      console.log('Charge ID:', chargeData.data.chargeId);
      console.log('Status:', chargeData.data.status);
      console.log('Due Date:', chargeData.data.dueDate);
      if (chargeData.data.pixQrCode) {
        console.log('PIX QR Code disponível ✓');
      }
    } else {
      console.log('❌ ERRO ao criar cobrança:\n');
      console.log(JSON.stringify(chargeData, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testCreateCharge();
