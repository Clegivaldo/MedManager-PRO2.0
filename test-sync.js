console.log('\n=== Sincronização Manual de Cobrança ===\n');

const chargeId = 'pay_zt9oq9134xv30yvx';
console.log(`Charge ID: ${chargeId}\n`);

// Fazer requisição POST para a API
const baseUrl = 'http://localhost:3333/api/v1';

// ⚠️ IMPORTANTE: Usar execFile ao invés de exec para prevenir command injection
console.log('1️⃣  Verificando status ANTES de sincronizar...');

const { execFile } = require('child_process');

// Usar execFile com array de argumentos (seguro contra injection)
execFile('docker', [
  'exec',
  'db',
  'psql',
  '-U',
  'postgres',
  'medmanager_master',
  '-c',
  `SELECT status FROM payments WHERE gateway_charge_id = '${chargeId}'`
], (error, stdout, stderr) => {
  if (error) {
    console.error('Erro ao verificar status:', error);
    return;
  }
  console.log('Status atual no BD:', stdout);

  console.log('\n2️⃣  Sincronizando...');
  
  // Usar axios ao invés de curl para requisições HTTP (mais seguro)
  const axios = require('axios');
  axios.post(`http://localhost:3333/api/v1/superadmin/charges/${chargeId}/sync`, {}, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid'
    }
  })
  .then(response => {
    console.log('Resposta da sincronização:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.error('Erro na sincronização:', error.response?.data || error.message);
  });
});
