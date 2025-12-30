import fetch from 'node-fetch';

const base = 'http://localhost:3333/api/v1';
const tenant = '12345678000155';

(async () => {
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medmanager.com.br', password: 'admin123', tenantCnpj: tenant })
  });
  const lj = await login.json();
  console.log('login', login.status, lj.message || lj.error || lj.code || 'ok');
  const token = lj.data?.tokens?.accessToken;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-tenant-cnpj': tenant };

  const prod = await fetch(`${base}/products`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Probe Product', internalCode: `P-${Date.now()}`, productType: 'COMMON' })
  });
  const pj = await prod.json();
  console.log('prod', prod.status, pj);
  const productId = pj.data?.id;

  const batch = await fetch(`${base}/batches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId, batchNumber: `B-${Date.now()}`, quantityEntry: 10, quantityCurrent: 10, expirationDate: new Date(Date.now() + 86400000).toISOString() })
  });
  const bj = await batch.json();
  console.log('batch', batch.status, bj);
})();
