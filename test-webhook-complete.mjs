const baseUrl = 'http://localhost:3333/api/v1';

let token = '';

async function login() {
  console.log('🔐 Fazendo login...');
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medmanager.com.br',
      password: 'password' // Tente diferentes senhas
    })
  });
  
  const data = await res.json();
  if (res.ok && data.data?.token) {
    token = data.data.token;
    console.log('✅ Login bem-sucedido!\n');
    return true;
  }
  console.log('❌ Erro ao fazer login. Tentando com a senha padrão...');
  return false;
}

async function createCharge() {
  try {
    // Primeiro, listar tenants para pegar o ID
    console.log('1️⃣  Buscando tenants...');
    const tenantsRes = await fetch(`${baseUrl}/superadmin/tenants?limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tenantsData = await tenantsRes.json();
    
    if (!tenantsData.tenants || tenantsData.tenants.length === 0) {
      console.error('❌ Nenhum tenant encontrado');
      return;
    }
    
    const tenantId = tenantsData.tenants[0].id;
    const tenantName = tenantsData.tenants[0].name;
    console.log(`✅ Tenant encontrado: ${tenantName} (${tenantId})\n`);

    // Criar cobrança
    console.log('2️⃣  Criando cobrança...');
    const chargeRes = await fetch(`${baseUrl}/superadmin/tenants/${tenantId}/create-charge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 50.00,
        paymentMethod: 'PIX',
        description: 'Teste de cobrança com webhook'
      })
    });

    const chargeData = await chargeRes.json();
    if (chargeRes.ok && chargeData.data?.chargeId) {
      const chargeId = chargeData.data.chargeId;
      console.log(`✅ Cobrança criada: ${chargeId}\n`);
      return { chargeId, tenantId };
    } else {
      console.error('❌ Erro ao criar cobrança:', chargeData);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  }
}

async function testWebhook(chargeId) {
  console.log(`3️⃣  Testando webhook para: ${chargeId}\n`);

  const payload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: chargeId,
      customer: 'cus_123456',
      value: 50.00,
      dueDate: '2025-11-26',
      status: 'RECEIVED',
      billingType: 'PIX',
      confirmedDate: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(`${baseUrl}/webhooks/asaas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': ''
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));

    if (response.ok && data.data?.updated) {
      console.log('\n✅ Webhook processado e cobrança atualizada!');
      return true;
    } else {
      console.log('\n⚠️  Webhook processado mas cobrança não foi atualizada');
      console.log('Mensagem:', data.data?.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

async function checkStatus(chargeId) {
  console.log(`\n4️⃣  Verificando status da cobrança...\n`);
  
  const chargesRes = await fetch(`${baseUrl}/superadmin/charges?search=${chargeId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const chargesData = await chargesRes.json();
  
  if (chargesData.charges && chargesData.charges.length > 0) {
    const charge = chargesData.charges[0];
    console.log(`Charge ID: ${charge.chargeId}`);
    console.log(`Status: ${charge.status}`);
    console.log(`Valor: R$ ${parseFloat(charge.amount).toFixed(2)}`);
    return charge.status;
  }
  return null;
}

async function main() {
  console.log('\n====== TESTE COMPLETO DE WEBHOOK ======\n');

  if (!await login()) {
    console.log('⚠️  Usando token vazio ou continuando...\n');
  }

  const result = await createCharge();
  if (!result) return;

  const { chargeId } = result;

  // Verificar status antes
  console.log('Status ANTES do webhook:');
  let statusBefore = await checkStatus(chargeId);
  console.log('');

  // Enviar webhook
  await testWebhook(chargeId);

  // Aguardar e verificar status depois
  console.log('\nAguardando 2 segundos...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('\nStatus DEPOIS do webhook:');
  let statusAfter = await checkStatus(chargeId);

  if (statusBefore === 'pending' && statusAfter === 'confirmed') {
    console.log('\n✨ SUCESSO! Webhook funcionou e atualizou a cobrança de pending para confirmed');
  } else if (statusAfter === 'confirmed') {
    console.log('\n✨ SUCESSO! Cobrança está confirmada');
  }

  console.log('\n');
}

main();
