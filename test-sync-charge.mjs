const baseUrl = 'http://localhost:3333/api/v1';
const chargeId = 'pay_zt9oq9134xv30yvx';

let token = '';

async function login() {
  console.log('🔐 Fazendo login...');
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medmanager.com.br',
      password: 'Teste@123'
    })
  });
  
  const data = await res.json();
  if (res.ok && data.data?.token) {
    token = data.data.token;
    console.log('✅ Login bem-sucedido!\n');
    return true;
  }
  console.error('❌ Erro ao fazer login:', data);
  return false;
}

async function test() {
  console.log('\n=== Teste de Sincronização de Cobrança ===\n');
  console.log(`Charge ID: ${chargeId}\n`);

  // Login
  if (!await login()) return;

  try {
    // 1. Buscar status da cobrança ANTES da sincronização
    console.log('1️⃣  Buscando status da cobrança antes da sincronização...');
    const chargesRes = await fetch(`${baseUrl}/superadmin/charges?search=${chargeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chargesData = await chargesRes.json();
    if (chargesData.charges && chargesData.charges.length > 0) {
      const charge = chargesData.charges[0];
      console.log(`   Status atual no BD: ${charge.status}`);
      console.log(`   Gateway: ${charge.gateway}`);
      console.log(`   Valor: R$ ${parseFloat(charge.amount).toFixed(2)}`);
      console.log(`   Vencimento: ${new Date(charge.dueDate).toLocaleDateString('pt-BR')}`);
    }

    // 2. Sincronizar status
    console.log('\n2️⃣  Sincronizando status com Asaas...');
    const syncRes = await fetch(`${baseUrl}/superadmin/charges/${chargeId}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const syncData = await syncRes.json();
    
    if (syncRes.ok) {
      console.log('   ✅ Sincronização bem-sucedida!');
      console.log(`   Mensagem: ${syncData.message}`);
      if (syncData.data.updated) {
        console.log(`   Status anterior: ${syncData.data.previousStatus}`);
        console.log(`   Status novo: ${syncData.data.newStatus}`);
      } else {
        console.log(`   Status atual: ${syncData.data.status}`);
      }
    } else {
      console.log(`   ❌ Erro: ${syncRes.status}`);
      console.log(`   Detalhes: ${JSON.stringify(syncData, null, 2)}`);
    }

    // 3. Buscar status APÓS a sincronização
    console.log('\n3️⃣  Verificando status após sincronização...');
    const chargesRes2 = await fetch(`${baseUrl}/superadmin/charges?search=${chargeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const chargesData2 = await chargesRes2.json();
    if (chargesData2.charges && chargesData2.charges.length > 0) {
      const charge = chargesData2.charges[0];
      console.log(`   ✅ Status no BD: ${charge.status}`);
    }

    console.log('\n✨ Teste concluído!\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

test();
