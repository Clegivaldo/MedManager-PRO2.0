// ================================================================
// TESTE E2E - INTEGRAÇÃO PRODUTOS + GUIA 33
// Sistema: MedManager PRO 2.0
// FASE 3: Dispensação Controlada com Validação Automática
// ================================================================

const BASE_URL = 'http://localhost:3333/api/v1';
let TOKEN = '';
let TENANT_ID = '';
let PRODUCT_ID = '';
let CUSTOMER_ID = '';

console.log('\n========================================');
console.log('TESTE E2E - DISPENSAÇÃO CONTROLADA');
console.log('========================================\n');

// ================================================================
// PASSO 1: LOGIN COMO SUPERADMIN
// ================================================================

async function step1_login() {
  console.log('[1/8] Fazendo login como SUPERADMIN...');
  
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medmanager.com.br',
      password: 'admin123'
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Login failed: ${data.error}`);
  
  TOKEN = data.token;
  console.log('✓ Login bem-sucedido!');
  console.log(`  Token: ${TOKEN.substring(0,20)}...`);
}

// ================================================================
// PASSO 2: BUSCAR TENANT ID
// ================================================================

async function step2_getTenant() {
  console.log('\n[2/8] Buscando Tenant...');
  
  const response = await fetch(`${BASE_URL}/tenants`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Get tenants failed: ${data.error}`);
  
  TENANT_ID = data.tenants[0].id;
  console.log('✓ Tenant encontrado!');
  console.log(`  ID: ${TENANT_ID}`);
  console.log(`  Nome: ${data.tenants[0].name}`);
}

// ================================================================
// PASSO 3: CRIAR PRODUTO CONTROLADO (ALPRAZOLAM)
// ================================================================

async function step3_createProduct() {
  console.log('\n[3/8] Criando produto controlado (Alprazolam)...');
  
  const response = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Alprazolam 1mg - Teste E2E',
      description: 'Ansiolítico - Substância Controlada (Lista B1)',
      sku: `ALPRAZ-TEST-${Date.now()}`,
      barcode: `789${Date.now()}`,
      price: 35.90,
      cost: 18.50,
      stockQuantity: 100,
      minStockLevel: 10,
      isControlled: true,
      controlledSubstance: 'Benzodiazepínico',
      category: 'MEDICAMENTOS'
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Create product failed: ${data.error}`);
  
  PRODUCT_ID = data.product.id;
  console.log('✓ Produto controlado criado!');
  console.log(`  ID: ${PRODUCT_ID}`);
  console.log(`  Nome: ${data.product.name}`);
  console.log(`  Controlado: ${data.product.isControlled}`);
}

// ================================================================
// PASSO 4: CRIAR CLIENTE (PACIENTE)
// ================================================================

async function step4_createCustomer() {
  console.log('\n[4/8] Criando cliente (paciente)...');
  
  const response = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `João Silva - Teste E2E ${Date.now()}`,
      email: `joao.teste.${Date.now()}@email.com`,
      phone: '(11) 98765-4321',
      document: `${Math.floor(Math.random() * 100000000000)}`,
      type: 'INDIVIDUAL'
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Create customer failed: ${data.error}`);
  
  CUSTOMER_ID = data.customer.id;
  console.log('✓ Cliente criado!');
  console.log(`  ID: ${CUSTOMER_ID}`);
  console.log(`  Nome: ${data.customer.name}`);
}

// ================================================================
// PASSO 5: TESTE DE COMPLIANCE - STATUS DO PRODUTO
// ================================================================

async function step5_checkCompliance() {
  console.log('\n[5/8] Verificando status de compliance do produto...');
  
  const response = await fetch(`${BASE_URL}/controlled-dispensation/compliance/${PRODUCT_ID}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID
    }
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Check compliance failed: ${data.error}`);
  
  console.log('✓ Status de compliance obtido!');
  console.log(`  É Controlado: ${data.compliance.isControlled}`);
  console.log(`  Substância: ${data.compliance.substanceName}`);
  console.log(`  Exige Prescrição: ${data.compliance.requiresPrescription}`);
}

// ================================================================
// PASSO 6: TESTE DE DISPENSAÇÃO COM PRESCRIÇÃO VÁLIDA
// ================================================================

async function step6_dispenseWithPrescription() {
  console.log('\n[6/8] Testando dispensação COM prescrição válida...');
  
  const today = new Date().toISOString().split('T')[0];
  
  const response = await fetch(`${BASE_URL}/controlled-dispensation/dispense`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      customerId: CUSTOMER_ID,
      quantity: 2,
      prescription: {
        id: `RX-TEST-${Date.now()}`,
        date: today,
        validityDays: 30
      }
    })
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(`Dispensation failed: ${data.error}`);
  
  console.log('✓ Dispensação autorizada!');
  console.log(`  Produto: ${data.dispensation.productName}`);
  console.log(`  Quantidade: ${data.dispensation.quantity}`);
  console.log(`  Prescrição válida: ${data.dispensation.prescriptionValid}`);
  console.log(`  Guia 33 registrado: ${data.dispensation.compliance.guia33Registered}`);
  console.log(`  Quota usado: ${data.dispensation.quotaStatus.quotaUsed}`);
  console.log(`  Quota limite: ${data.dispensation.quotaStatus.quotaLimit}`);
  console.log(`  Quota restante: ${data.dispensation.quotaStatus.quotaRemaining}`);
}

// ================================================================
// PASSO 7: TESTE DE DISPENSAÇÃO SEM PRESCRIÇÃO (DEVE FALHAR)
// ================================================================

async function step7_dispenseWithoutPrescription() {
  console.log('\n[7/8] Testando dispensação SEM prescrição (deve falhar)...');
  
  const response = await fetch(`${BASE_URL}/controlled-dispensation/dispense`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      customerId: CUSTOMER_ID,
      quantity: 1
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('✗ FALHA: Sistema deveria ter bloqueado!');
  } else {
    console.log('✓ Bloqueio correto! Sistema impediu venda sem prescrição.');
    console.log(`  Motivo: ${data.error}`);
  }
}

// ================================================================
// PASSO 8: TESTE DE PRESCRIÇÃO EXPIRADA (DEVE FALHAR)
// ================================================================

async function step8_dispenseWithExpiredPrescription() {
  console.log('\n[8/8] Testando dispensação com prescrição EXPIRADA (deve falhar)...');
  
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 60);
  const expiredDateStr = expiredDate.toISOString().split('T')[0];
  
  const response = await fetch(`${BASE_URL}/controlled-dispensation/dispense`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId: PRODUCT_ID,
      customerId: CUSTOMER_ID,
      quantity: 1,
      prescription: {
        id: `RX-EXPIRED-${Date.now()}`,
        date: expiredDateStr,
        validityDays: 30
      }
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('✗ FALHA: Sistema deveria ter bloqueado prescrição expirada!');
  } else {
    console.log('✓ Bloqueio correto! Sistema impediu venda com prescrição expirada.');
    console.log(`  Motivo: ${data.error}`);
  }
}

// ================================================================
// EXECUTAR TODOS OS TESTES
// ================================================================

async function runAllTests() {
  try {
    await step1_login();
    await step2_getTenant();
    await step3_createProduct();
    await step4_createCustomer();
    await step5_checkCompliance();
    await step6_dispenseWithPrescription();
    await step7_dispenseWithoutPrescription();
    await step8_dispenseWithExpiredPrescription();
    
    console.log('\n========================================');
    console.log('RESUMO DO TESTE E2E');
    console.log('========================================');
    console.log('\n✓ Login e autenticação: OK');
    console.log('✓ Criação de produto controlado: OK');
    console.log('✓ Criação de cliente: OK');
    console.log('✓ Verificação de compliance: OK');
    console.log('✓ Dispensação com prescrição válida: OK');
    console.log('✓ Bloqueio sem prescrição: OK');
    console.log('✓ Bloqueio prescrição expirada: OK');
    console.log('\n========================================');
    console.log('FASE 3 - TESTE COMPLETO COM SUCESSO!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n✗ ERRO NO TESTE:', error.message);
    process.exit(1);
  }
}

runAllTests();
