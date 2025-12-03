console.log('\n=== Sincronização Manual de Cobrança ===\n');

const chargeId = 'pay_zt9oq9134xv30yvx';
console.log(`Charge ID: ${chargeId}\n`);

// Fazer requisição POST para a API
const baseUrl = 'http://localhost:3333/api/v1';

// Como não temos um token, vamos direto no banco para sincronizar
// Primeiro, vamos checar o status atual
console.log('1️⃣  Verificando status ANTES de sincronizar...');

const { exec } = require('child_process');

exec(`docker exec db psql -U postgres medmanager_master -c "SELECT status FROM payments WHERE gateway_charge_id = '${chargeId}'"`, (error, stdout, stderr) => {
  if (error) {
    console.error('Erro ao verificar status:', error);
    return;
  }
  console.log('Status atual no BD:', stdout);

  // Agora fazemos a sincronização
  console.log('\n2️⃣  Sincronizando...');
  
  // Vamos usar curl para fazer POST no endpoint
  exec(`curl -X POST http://localhost:3333/api/v1/superadmin/charges/${chargeId}/sync \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer invalid" 2>/dev/null | jq .`, 
    (error, stdout, stderr) => {
      console.log('Resposta da sincronização:', stdout);
    });
});
