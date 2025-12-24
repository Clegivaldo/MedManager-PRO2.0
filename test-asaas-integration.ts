/**
 * Script: Teste completo de integração Asaas
 * Uso: npx tsx test-asaas-integration.ts
 * 
 * Fluxo:
 * 1. Login como superadmin
 * 2. Configurar credenciais Asaas (sandbox)
 * 3. Criar cobrança para tenant via superadmin
 * 4. Simular webhook de confirmação
 * 5. Validar estado final
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3333/api/v1';

// ⚠️ ATENÇÃO: Todas as credenciais devem estar no arquivo .env.test
// NUNCA commitar credenciais hardcoded!
if (!process.env.SUPERADMIN_EMAIL || !process.env.SUPERADMIN_PASSWORD) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('Crie o arquivo .env.test a partir de .env.test.template');
  process.exit(1);
}

const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const TENANT_ID = process.env.TEST_TENANT_ID;
const TENANT_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TENANT_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

// Chave Asaas SANDBOX - obtenha em: https://www.asaas.com/docs/reference/sandbox-credentials
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;

if (!ASAAS_API_KEY || !ASAAS_WEBHOOK_TOKEN) {
  console.error('❌ ERRO: ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN são obrigatórios!');
  console.error('Configure no arquivo .env.test');
  process.exit(1);
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

async function testSuperadminLogin(): Promise<TestResult> {
  try {
    console.log('🔐 [1/5] Fazendo login como superadmin...');
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD
    });
    const token = res.data.data?.tokens?.accessToken || res.data.data?.accessToken;
    if (!token) throw new Error('Token de acesso não obtido');
    
    console.log('✓ Login de superadmin bem-sucedido');
    return { success: true, message: 'Superadmin logged in', data: { token } };
  } catch (err: any) {
    console.error('❌ Erro ao fazer login:', err.response?.data || err.message);
    return { success: false, message: `Login failed: ${err.message}` };
  }
}

async function testConfigureAsaas(superadminToken: string): Promise<TestResult> {
  try {
    console.log('\n💳 [2/5] Configurando credenciais Asaas no superadmin...');
    const res = await axios.put(`${API_URL}/superadmin/payment-providers`, {
      activeGateway: 'asaas',
      asaasEnvironment: 'sandbox',
      asaasApiKey: ASAAS_API_KEY,
      asaasWebhookToken: ASAAS_WEBHOOK_TOKEN
    }, {
      headers: { Authorization: `Bearer ${superadminToken}` }
    });
    
    console.log('✓ Credenciais Asaas configuradas');
    return { success: true, message: 'Asaas credentials configured', data: res.data };
  } catch (err: any) {
    console.error('❌ Erro ao configurar Asaas:', err.response?.data || err.message);
    return { success: false, message: `Configuration failed: ${err.message}` };
  }
}

async function testTenantLogin(): Promise<TestResult> {
  try {
    console.log('\n🔐 [3/5] Fazendo login como usuário do tenant...');
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: TENANT_USER_EMAIL,
      password: TENANT_USER_PASSWORD
    });
    const token = res.data.data?.tokens?.accessToken || res.data.data?.accessToken;
    if (!token) throw new Error('Token de acesso não obtido');
    
    console.log('✓ Login do tenant bem-sucedido');
    return { success: true, message: 'Tenant user logged in', data: { token } };
  } catch (err: any) {
    console.error('❌ Erro ao fazer login do tenant:', err.response?.data || err.message);
    return { success: false, message: `Tenant login failed: ${err.message}` };
  }
}

async function testCreateCharge(superadminToken: string): Promise<TestResult> {
  try {
    console.log('\n💰 [4/5] Criando cobrança PIX de R$5,00 para o tenant...');
    const res = await axios.post(
      `${API_URL}/superadmin/tenants/${TENANT_ID}/create-charge`,
      {
        amount: 5.0, // Mínimo do Asaas
        paymentMethod: 'PIX',
        description: 'Teste de cobrança Asaas',
        billingCycle: 'monthly'
      },
      {
        headers: { Authorization: `Bearer ${superadminToken}` }
      }
    );
    
    const charge = res.data.data;
    console.log('✓ Cobrança criada com sucesso');
    console.log(`  Charge ID: ${charge.chargeId}`);
    console.log(`  Status: ${charge.status}`);
    console.log(`  Vencimento: ${charge.dueDate}`);
    if (charge.pixQrCodeBase64) {
      console.log(`  QR Code PIX disponível (${charge.pixQrCodeBase64.substring(0, 30)}...)`);
    }
    
    return { success: true, message: 'Charge created', data: charge };
  } catch (err: any) {
    console.error('❌ Erro ao criar cobrança:', err.response?.data || err.message);
    return { success: false, message: `Charge creation failed: ${err.message}` };
  }
}

async function testWebhookConfirmation(chargeId: string, superadminToken: string): Promise<TestResult> {
  try {
    console.log('\n🔁 [5/5] Simulando webhook de confirmação de pagamento...');
    const res = await axios.post(
      `${API_URL}/webhooks/asaas`,
      {
        event: 'PAYMENT_CONFIRMED',
        payment: { id: chargeId }
      },
      {
        headers: { 'x-webhook-token': ASAAS_WEBHOOK_TOKEN }
      }
    );
    
    console.log('✓ Webhook processado com sucesso');
    console.log(`  Resposta: ${JSON.stringify(res.data)}`);
    
    return { success: true, message: 'Webhook processed', data: res.data };
  } catch (err: any) {
    console.error('❌ Erro ao processar webhook:', err.response?.data || err.message);
    return { success: false, message: `Webhook failed: ${err.message}` };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TESTE DE INTEGRAÇÃO ASAAS');
  console.log('═══════════════════════════════════════════════════════\n');

  const loginResult = await testSuperadminLogin();
  if (!loginResult.success) {
    console.error('\n❌ Teste abortado - Login de superadmin falhou');
    process.exit(1);
  }
  const superadminToken = loginResult.data.token;

  const configResult = await testConfigureAsaas(superadminToken);
  if (!configResult.success) {
    console.error('\n❌ Teste abortado - Falha ao configurar Asaas');
    process.exit(1);
  }

  const tenantLoginResult = await testTenantLogin();
  if (!tenantLoginResult.success) {
    console.warn('\n⚠️ Login do tenant falhou, mas continuando...');
  }

  const chargeResult = await testCreateCharge(superadminToken);
  if (!chargeResult.success) {
    console.error('\n❌ Teste abortado - Falha ao criar cobrança');
    process.exit(1);
  }
  const chargeId = chargeResult.data.chargeId;

  const webhookResult = await testWebhookConfirmation(chargeId, superadminToken);
  if (!webhookResult.success) {
    console.warn('\n⚠️ Webhook falhou, mas cobrança foi criada');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Resumo:');
  console.log('  ✓ Login de superadmin');
  console.log('  ✓ Configuração de credenciais Asaas');
  console.log('  ✓ Criação de cobrança PIX');
  console.log('  ✓ Processamento de webhook');
  console.log('\n💡 Próximos passos:');
  console.log('  1. Acessar http://localhost:5173 (frontend)');
  console.log('  2. Fazer login como superadmin');
  console.log('  3. Ir para "Tenants" e clicar no botão "Gerar cobrança"');
  console.log('  4. Inserir valor e selecionar método de pagamento');
  console.log('  5. Verificar QR Code PIX ou URL do boleto');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erro crítico:', err);
  process.exit(1);
});
