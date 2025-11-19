import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

const base = 'http://localhost:3333/api/v1';
const tenantCnpj = '12.345.678/0001-55';

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medmanager.com.br', password: 'admin123' })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.data.tokens.accessToken as string;
}

describe('Invoice flow (draft -> emit)', () => {
  let token: string;
  beforeAll(async () => {
    token = await login();
  });

  it('creates draft and emits invoice (mock)', async () => {
    // IDs do seed básico
    const customerId = process.env.SEED_CUSTOMER_ID || '62ee4a4e-3fe4-4991-be69-580caa164afb';
    const productId = process.env.SEED_PRODUCT_ID || '85d1df2d-da39-43ee-8498-edf0c03249e2';
    const batchId = process.env.SEED_BATCH_ID || '615e9019-8b0d-4e8f-a513-5a77581aa23e';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    const draftRes = await fetch(`${base}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId,
        items: [{ productId, quantity: 1, unitPrice: 10.5, discount: 0, batchId }],
        paymentMethod: 'pix',
        installments: 1,
        observations: 'Teste vitest',
        operationType: 'sale'
      })
    });
    const draft = await draftRes.json();
    expect(draftRes.ok).toBe(true);
    expect(draft.status).toBe('DRAFT');

    const emitRes = await fetch(`${base}/invoices/${draft.id}/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const emitted = await emitRes.json();
    expect(emitRes.ok).toBe(true);
    expect(emitted.status).toBe('AUTHORIZED');
    expect(emitted.accessKey).toBeTruthy();
  });
});
