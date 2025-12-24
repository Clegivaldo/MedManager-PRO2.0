// ⚠️ ATENÇÃO: Carregar credenciais de .env.test
require('dotenv').config({ path: '.env.test' });

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERRO: Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.test');
  process.exit(1);
}


(async () => {
  const payload = { cnpj: '12345678000195', email: 'admin@farmaciademo.com.br', password: process.env.TEST_USER_PASSWORD || 'admin123' };
  const loginRes = await fetch('http://localhost:3333/api/v1/auth/login-tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const login = await loginRes.json();
  console.log('login status', loginRes.status, login.success);
  const token = login?.data?.tokens?.accessToken;
  const tenantId = login?.data?.tenant?.id;
  if (!token) { console.error('no token'); process.exit(1); }

  const dashRes = await fetch('http://localhost:3333/api/v1/dashboard/metrics', {
    headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenantId }
  });
  console.log('metrics status', dashRes.status);
  const dash = await dashRes.json();
  console.log(JSON.stringify(dash, null, 2));
})();
