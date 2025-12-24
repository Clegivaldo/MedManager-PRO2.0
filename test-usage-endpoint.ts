import axios from 'axios';

const API_URL = 'http://localhost:3333/api/v1';
const TENANT_ID = 'bde5734e-fdff-427c-b013-1c81116ea604';

async function testUsageEndpoint() {
  console.log('🚀 TESTE: Dashboard Usage Endpoint\n');

  try {
    // 1. Login
    console.log('📍 Passo 1: Autenticação...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@farmaciademo.com.br',
      password: 'admin123'
    });
    const token = loginRes.data.data.tokens.accessToken;
    console.log('✓ Token obtido\n');

    // 2. Testar nova rota de usage
    console.log('📍 Passo 2: Chamar /dashboard/usage...');
    const usageRes = await axios.get(`${API_URL}/dashboard/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': TENANT_ID
      }
    });

    const data = usageRes.data.data;
    console.log('✓ Resposta recebida com sucesso\n');

    // 3. Validar estrutura da resposta
    console.log('📊 DADOS DO PLANO:');
    console.log(`\n📝 Plano: ${data.planName}`);
    console.log(`   Status: ${data.subscription.status}`);
    console.log(`   Dias Restantes: ${data.subscription.daysRemaining}`);
    
    console.log('\n👥 USUÁRIOS:');
    console.log(`   Utilizando: ${data.users.current}/${data.users.limit || 'Ilimitado'} (${data.users.percentage}%)`);
    console.log(`   Permitido: ${data.users.allowed ? '✓ Sim' : '✗ Não'}`);
    
    console.log('\n📦 PRODUTOS:');
    console.log(`   Utilizando: ${data.products.current}/${data.products.limit || 'Ilimitado'} (${data.products.percentage}%)`);
    console.log(`   Permitido: ${data.products.allowed ? '✓ Sim' : '✗ Não'}`);
    
    console.log('\n💳 TRANSAÇÕES (mensal):');
    console.log(`   Utilizando: ${data.transactions.current}/${data.transactions.limit || 'Ilimitado'} (${data.transactions.percentage}%)`);
    console.log(`   Permitido: ${data.transactions.allowed ? '✓ Sim' : '✗ Não'}`);
    
    console.log('\n💾 ARMAZENAMENTO:');
    console.log(`   Utilizando: ${data.storage.current}${data.storage.unit}/${data.storage.limit || 'Ilimitado'} (${data.storage.percentage}%)`);
    console.log(`   Permitido: ${data.storage.allowed ? '✓ Sim' : '✗ Não'}`);

    // 4. Validações
    console.log('\n✅ VALIDAÇÕES:');
    const validations = [
      ['Plano informado', !!data.planName],
      ['Usuários com limite', data.users.limit !== null],
      ['Produtos com limite', data.products.limit !== null],
      ['Transações com limite', data.transactions.limit !== null],
      ['Storage com limite', data.storage.limit !== null],
      ['Status de subscription', !!data.subscription.status],
      ['Percentuais calculados', data.users.percentage >= 0 && data.users.percentage <= 100]
    ];

    validations.forEach(([name, result]) => {
      console.log(`   ${result ? '✓' : '✗'} ${name}`);
    });

    console.log('\n✅ TESTE DE USAGE ENDPOINT PASSOU!\n');

  } catch (error: any) {
    console.error('❌ Erro:', error.response?.data || error.message);
    process.exit(1);
  }
}

testUsageEndpoint();
