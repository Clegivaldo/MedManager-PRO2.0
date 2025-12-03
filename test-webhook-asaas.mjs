// Script para testar webhook localmente
const baseUrl = 'http://localhost:3333/api/v1';

async function testWebhook() {
  console.log('\n=== Teste de Webhook do Asaas ===\n');
  
  // Simular webhook de pagamento recebido
  const payload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_zt9oq9134xv30yvx',  // Cobrança que queremos confirmar
      customer: 'cus_123456',
      value: 50.00,
      dueDate: '2025-11-26',
      status: 'RECEIVED',
      billingType: 'PIX',
      confirmedDate: new Date().toISOString()
    }
  };

  try {
    console.log('Enviando webhook...');
    console.log('Evento:', payload.event);
    console.log('Payment ID:', payload.payment.id);
    console.log('');

    const response = await fetch(`${baseUrl}/webhooks/asaas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': 'test-token-123'  // Token de teste
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Webhook processado com sucesso!');
      
      // Aguardar um pouco e verificar o banco
      console.log('\nAguardando 2 segundos...\n');
      await new Promise(r => setTimeout(r, 2000));
      
      // Verificar status no banco
      console.log('Verificando status no banco de dados...');
      const { execSync } = require('child_process');
      try {
        const result = execSync(`docker exec db psql -U postgres medmanager_master -c "SELECT status FROM payments WHERE gateway_charge_id = 'pay_zt9oq9134xv30yvx';"`, { encoding: 'utf-8' });
        console.log('Status atual:', result);
      } catch (e) {
        console.error('Erro ao consultar banco');
      }
    } else {
      console.log('\n❌ Erro ao processar webhook');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('\n');
}

testWebhook();
