import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';

const base = 'http://localhost:3333/api/v1';
// Usar CNPJ sem máscara conforme seed
const tenantCnpj = '12345678000155';

async function login() {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medmanager.com.br', password: 'admin123', tenantCnpj })
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

  it('ensures fiscal profile and series exist', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    // Primeiro tenta obter perfil existente
    let profileRes = await fetch(`${base}/fiscal`, { headers });
    if (profileRes.status === 404) {
      // Criar se não existir
      profileRes = await fetch(`${base}/fiscal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          companyName: 'Tenant Demo LTDA',
          tradingName: 'Tenant Demo',
          cnpj: tenantCnpj,
          taxRegime: 'simple_national',
          sefazEnvironment: 'homologacao'
        })
      });
    }
    const profile = await profileRes.json() as any;
    expect(profileRes.ok).toBe(true);
    expect(profile.profile.cnpj).toBe(tenantCnpj);

    // Verificar série EXIT #1
    let seriesRes = await fetch(`${base}/fiscal/series`, { headers });
    if (seriesRes.status === 404) {
      seriesRes = await fetch(`${base}/fiscal/series`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ seriesNumber: 1, invoiceType: 'EXIT', nextNumber: 1 })
      });
      const series = await seriesRes.json() as any;
      expect(seriesRes.ok).toBe(true);
      expect(series.series.seriesNumber).toBe(1);
    } else {
      const seriesList = await seriesRes.json() as any;
      expect(seriesRes.ok).toBe(true);
      // Aceitar que já exista
    }
  });
});
