/**
 * Script: Criar cobrança Asaas (R$1,00) e simular webhook de confirmação
 * Uso: npx tsx test-create-charge-and-webhook.ts
 * Pré-requisitos:
 *  - Login do usuário superadmin/tenant com email e senha válidos
 *  - API Key Asaas salva em /superadmin/payments
 */
import axios from 'axios';

const API_URL = 'http://localhost:3333/api/v1';
const TENANT_ID = process.env.TEST_TENANT_ID || 'ca1372e9-f78a-489f-b2cd-38ead44e95c9'; // Farmácia Demo
const USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin@farmaciademo.com';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'admin123';
const PAYMENT_METHOD = (process.argv[2] || 'PIX').toUpperCase() as 'PIX' | 'BOLETO';
// Token do webhook (mesmo cadastrado no painel Asaas). Ajustar se diferente.
const WEBHOOK_TOKEN = process.env.TEST_ASAAS_WEBHOOK_TOKEN || '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmU1MWFlZjc3LTY5NTYtNDZhMi05ZjZhLTg5NDhkOThmZTIxZjo6JGFhY2hfMzUzNWFmNGItMDNmNC00MWU0LWEyMTAtZWNlMzMxMzExNmQ3';

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
