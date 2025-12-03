const http = require('http');

const chargeId = 'pay_zt9oq9134xv30yvx';

// Função para fazer requisição POST
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3333,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZhYWQzZmQ3LTI5ZTItNDY5Ni04NzA2LWY3YmI4YmZkYmVmNCIsImVtYWlsIjoiYWRtaW5AbWVkbWFuYWdlci5jb20uYnIiLCJ0eXBlIjoic3VwZXJhZG1pbiIsImV4cCI6MTczODEwMDAwMH0.test'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('\n=== Teste de Sincronização de Cobrança ===\n');
  console.log(`Charge ID: ${chargeId}\n`);

  try {
    // 1. Buscar status da cobrança ANTES da sincronização
    console.log('1️⃣  Buscando status da cobrança antes da sincronização...');
    const chargesRes = await makeRequest('GET', '/superadmin/charges?search=' + chargeId);
    if (chargesRes.data.charges && chargesRes.data.charges.length > 0) {
      const charge = chargesRes.data.charges[0];
      console.log(`   Status atual no BD: ${charge.status}`);
      console.log(`   Gateway: ${charge.gateway}`);
      console.log(`   Valor: R$ ${parseFloat(charge.amount).toFixed(2)}`);
    }

    // 2. Sincronizar status
    console.log('\n2️⃣  Sincronizando status com Asaas...');
    const syncRes = await makeRequest('POST', `/superadmin/charges/${chargeId}/sync`);
    
    if (syncRes.status === 200) {
      console.log('   ✅ Sincronização bem-sucedida!');
      console.log(`   Mensagem: ${syncRes.data.message}`);
      if (syncRes.data.data.updated) {
        console.log(`   Status anterior: ${syncRes.data.data.previousStatus}`);
        console.log(`   Status novo: ${syncRes.data.data.newStatus}`);
      } else {
        console.log(`   Status atual: ${syncRes.data.data.status}`);
      }
    } else {
      console.log(`   ❌ Erro: ${syncRes.status}`);
      console.log(`   Detalhes: ${JSON.stringify(syncRes.data, null, 2)}`);
    }

    // 3. Buscar status APÓS a sincronização
    console.log('\n3️⃣  Verificando status após sincronização...');
    const chargesRes2 = await makeRequest('GET', '/superadmin/charges?search=' + chargeId);
    if (chargesRes2.data.charges && chargesRes2.data.charges.length > 0) {
      const charge = chargesRes2.data.charges[0];
      console.log(`   ✅ Status no BD: ${charge.status}`);
    }

    console.log('\n✨ Teste concluído!\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

test();
