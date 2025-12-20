import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

const base = 'http://localhost:3333/api/v1';
const tenantCnpj = '12345678000155';

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medmanager.com.br', password: 'admin123', tenantCnpj })
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
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    // Criar cliente
    const customerRes = await fetch(`${base}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyName: 'Cliente Teste Invoice',
        tradeName: 'Cliente Invoice',
        cnpjCpf: `${Date.now()}`.slice(-14).padStart(14, '0'),
        customerType: 'COMPANY',
        email: 'cli-invoice@example.com',
        phone: '11999990000'
      })
    });
    expect(customerRes.ok).toBe(true);
    const customer = await customerRes.json() as any;
    const customerId = customer.data.id;

    // Criar produto
    const productRes = await fetch(`${base}/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Produto Invoice',
        internalCode: `PINV-${Date.now()}`,
        productType: 'COMMON'
      })
    });
    expect(productRes.ok).toBe(true);
    const product = await productRes.json() as any;
    const productId = product.data.id;

    // Criar lote
    const batchRes = await fetch(`${base}/batches`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productId,
        batchNumber: `B-${Date.now()}`,
        quantityEntry: 10,
        quantityCurrent: 10,
        expirationDate: new Date(Date.now() + 180*24*60*60*1000).toISOString()
      })
    });
    expect(batchRes.ok).toBe(true);
    const batch = await batchRes.json() as any;
    const batchId = batch.data.id;

    // NOTA: O estoque deve ser criado automaticamente pelo backend
    // ou pela seed. Por ora, vamos assumir que a invoice route irá 
    // criar o stock entry automaticamente se não existir (lógica futura).

    // Criar nota fiscal (rascunho)
    const draftRes = await fetch(`${base}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId,
        items: [{ productId, quantity: 1, unitPrice: 10.5, discount: 0, batchId }],
        observations: 'Teste vitest invoice',
        paymentMethod: 'pix',
        invoiceType: 'EXIT'
      })
    });
    if (!draftRes.ok) {
      const errorBody = await draftRes.json();
      console.log('Draft creation failed:', draftRes.status, errorBody);
    }
    expect(draftRes.ok).toBe(true);
    const draft = await draftRes.json() as any;
    expect(draft.status).toBe('DRAFT');
    const invoiceId = draft.id;

    // Emitir (simulado)
    const emitRes = await fetch(`${base}/invoices/${invoiceId}/emit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const emitted = await emitRes.json() as any;
    if (!emitRes.ok) {
      // Emissão real depende de certificado A1 configurado; permitimos falha controlada
      expect(emitted.error || emitted.message).toMatch(/certific/i);
      return;
    }
    expect(emitted.status).toBe('AUTHORIZED');
    expect(emitted.accessKey).toBeTruthy();
  });
});
