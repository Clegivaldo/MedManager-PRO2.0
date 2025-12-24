/**
 * Script: Criar cobrança Asaas (R$1,00) e simular webhook de confirmação
 * Uso: npx tsx test-create-charge-and-webhook.ts
 * Pré-requisitos:
 *  - Login do usuário superadmin/tenant com email e senha válidos
 *  - API Key Asaas salva em /superadmin/payments
 */
import axios from 'axios';

// ⚠️ ATENÇÃO: Todas as credenciais devem estar no arquivo .env.test
if (!process.env.TEST_TENANT_ID || !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('Crie o arquivo .env.test a partir de .env.test.template');
  process.exit(1);
}

const API_URL = process.env.API_URL || 'http://localhost:3333/api/v1';
const TENANT_ID = process.env.TEST_TENANT_ID;
const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const PAYMENT_METHOD = (process.argv[2] || 'PIX').toUpperCase() as 'PIX' | 'BOLETO';
const WEBHOOK_TOKEN = process.env.TEST_ASAAS_WEBHOOK_TOKEN;

if (!WEBHOOK_TOKEN) {
  console.error('❌ ERRO: TEST_ASAAS_WEBHOOK_TOKEN é obrigatório!');
  process.exit(1);
}

async function main() {
  console.log('🚀 Iniciando teste de cobrança + webhook Asaas\n');

  // Login
  console.log('🔐 Fazendo login...');
  const loginRes = await axios.post(`${API_URL}/auth/login`, { email: USER_EMAIL, password: USER_PASSWORD });
  const accessToken = loginRes.data.data?.tokens?.accessToken || loginRes.data.data?.accessToken;
  if (!accessToken) throw new Error('Token de acesso não obtido');
  console.log('✓ Login OK');

  // Criar cobrança (PIX ou BOLETO)
  console.log(`\n💳 Criando cobrança ${PAYMENT_METHOD} R$5,00...`);
  const chargeRes = await axios.post(`${API_URL}/payments/create-charge`, {
    amount: 5.0,
    paymentMethod: PAYMENT_METHOD,
    description: `Teste cobrança R$5,00 (${PAYMENT_METHOD})`,
    billingCycle: 'monthly'
  }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-tenant-id': TENANT_ID }
  });

  const chargeData = chargeRes.data.data;
  console.log('✓ Cobrança criada');
  console.log(`  Charge ID: ${chargeData.chargeId}`);
  console.log(`  Status inicial: ${chargeData.status}`);
  console.log(`  DueDate: ${chargeData.dueDate}`);
  if (PAYMENT_METHOD === 'PIX' && chargeData.pixQrCodeBase64) {
    console.log('  Pix QR Code (base64 - truncado):', chargeData.pixQrCodeBase64.substring(0, 60) + '...');
  } else if (PAYMENT_METHOD === 'BOLETO' && chargeData.boletoUrl) {
    console.log('  Boleto URL:', chargeData.boletoUrl);
  }

  // Simular webhook PAYMENT_CONFIRMED
  console.log('\n🔁 Simulando webhook PAYMENT_CONFIRMED...');
  const webhookPayload = {
    event: 'PAYMENT_CONFIRMED',
    payment: { id: chargeData.chargeId }
  };
  const webhookRes = await axios.post(`${API_URL}/webhooks/asaas`, webhookPayload, {
    headers: { 'x-webhook-token': WEBHOOK_TOKEN }
  });
  console.log('✓ Webhook processado:', webhookRes.data);

  // Consultar status da cobrança
  console.log('\n🔎 Consultando status atualizado da cobrança...');
  const statusRes = await axios.get(`${API_URL}/payments/status/${chargeData.chargeId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-tenant-id': TENANT_ID }
  });
  console.log('✓ Status pós-webhook:', statusRes.data.data);

  // Consultar assinatura
  console.log('\n📄 Verificando assinatura do tenant...');
  const subRes = await axios.get(`${API_URL}/subscriptions/info`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-tenant-id': TENANT_ID }
  });
  console.log('✓ Assinatura após confirmação:', subRes.data.data);

  console.log('\n✅ Teste concluído.');
}

main().catch(err => {
  console.error('❌ Erro no teste:', err.response?.data || err.message);
  process.exit(1);
});
