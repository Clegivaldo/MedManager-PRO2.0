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
  const json = await res.json() as any;
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json.data.tokens.accessToken as string;
}

describe('Fiscal Profile setup', () => {
  let token: string;
  beforeAll(async () => {
    token = await login();
  });

  it('creates fiscal profile and series', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    const profileRes = await fetch(`${base}/fiscal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        companyName: 'Tenant Demo LTDA',
        tradingName: 'Tenant Demo',
        cnpj: '12345678000155',
        stateRegistration: '123456789',
        taxRegime: 'simple_national',
        address: {
          street: 'Rua Teste',
          number: '100',
          district: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000'
        },
        email: 'fiscal@tenantdemo.com',
        cscId: 'CSC001',
        cscToken: 'TOKEN_CSC_HOMOLOGACAO',
        sefazEnvironment: 'homologacao'
      })
    });

    const profile = await profileRes.json() as any;
    if (!profileRes.ok) {
      console.error('Fiscal profile creation failed:', profile);
    }
    expect(profileRes.ok).toBe(true);
    expect(profile.profile.cnpj).toBe('12345678000155');

    const seriesRes = await fetch(`${base}/fiscal/series`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        seriesNumber: 1,
        invoiceType: 'EXIT',
        nextNumber: 1
      })
    });

    const series = await seriesRes.json() as any;
    if (!seriesRes.ok) {
      console.error('Fiscal series creation failed:', series);
    }
    expect(seriesRes.ok).toBe(true);
    expect(series.series.seriesNumber).toBe(1);
  });
});
