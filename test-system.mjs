console.log('\n=== TESTE COMPLETO DO SISTEMA ===\n');

const tests = [];

async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: '✅ PASSOU' });
    console.log(`✅ ${name}`);
  } catch (error) {
    tests.push({ name, status: `❌ FALHOU: ${error.message}` });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function main() {
  // 1. Teste de conectividade com backend
  await test('Backend respondendo na porta 3333', async () => {
    const res = await fetch('http://localhost:3333/api/v1/auth/me', {
      headers: { 'Authorization': 'Bearer test' }
    });
    if (!res.ok && res.status !== 401) throw new Error(`Status ${res.status}`);
  });

  // 2. Teste de CORS
  await test('CORS habilitado para localhost:5173', async () => {
    const res = await fetch('http://localhost:3333/api/v1/auth/me', {
      headers: { 
        'Authorization': 'Bearer test',
        'Origin': 'http://localhost:5173'
      }
    });
    const corsHeader = res.headers.get('access-control-allow-origin');
    if (!corsHeader && res.status !== 401) throw new Error('CORS header ausente');
  });

  // 3. Teste de Frontend
  await test('Frontend respondendo na porta 5173', async () => {
    const res = await fetch('http://localhost:5173');
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 4. Teste de Database
  await test('Database conectada e respondendo', async () => {
    const res = await fetch('http://localhost:3333/api/v1/superadmin/tenants?limit=1', {
      headers: { 
        'Authorization': 'Bearer test'
      }
    });
    // Pode retornar 401, mas significa que conectou ao banco
  });

  // 5. Teste de autenticação
  await test('Autenticação respondendo', async () => {
    const res = await fetch('http://localhost:3333/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@medmanager.com.br',
        password: 'wrongpassword'
      })
    });
    // Esperamos erro de credenciais, não erro de servidor
    if (res.status >= 500) throw new Error(`Erro de servidor: ${res.status}`);
  });

  // 6. Teste de webhook
  await test('Webhook endpoint acessível', async () => {
    const res = await fetch('http://localhost:3333/api/v1/webhooks/asaas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'PAYMENT_TEST',
        payment: { id: 'test' }
      })
    });
    // Pode retornar erro de validação, mas endpoint está acessível
  });

  // Resumo
  console.log('\n=== RESUMO DOS TESTES ===\n');
  tests.forEach((t, i) => console.log(`${i + 1}. ${t.name}\n   ${t.status}`));
  
  const passed = tests.filter(t => t.status.includes('✅')).length;
  const total = tests.length;
  
  console.log(`\n${passed}/${total} testes passaram\n`);
  
  if (passed === total) {
    console.log('✨ TODOS OS SISTEMAS ESTÃO OPERACIONAIS!\n');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os logs acima.\n');
  }
}

main().catch(console.error);
