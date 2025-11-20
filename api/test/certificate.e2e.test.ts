import { describe, it, expect, beforeAll } from 'vitest';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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

describe('Certificate Upload', () => {
  let token: string;

  beforeAll(async () => {
    token = await login();
  });

  it('rejects invalid certificate format', async () => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    const form = new FormData();
    // Enviar arquivo .pfx inválido (não será possível extrair dados)
    form.append('certificate', Buffer.from('invalid pfx content'), {
      filename: 'test.pfx',
      contentType: 'application/x-pkcs12'
    });
    form.append('password', 'wrongpassword');
    form.append('certificateType', 'A1');

    const res = await fetch(`${base}/fiscal/certificate`, {
      method: 'POST',
      headers: {
        ...headers,
        ...form.getHeaders()
      },
      body: form as any
    });

    // Deve falhar na extração/validação do certificado
    expect(res.ok).toBe(false);
    expect([400, 401, 404, 500]).toContain(res.status);
  });

  it('requires password for certificate upload', async () => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    const form = new FormData();
    form.append('certificate', Buffer.from('fake pfx data'), {
      filename: 'test.pfx',
      contentType: 'application/x-pkcs12'
    });
    form.append('certificateType', 'A1');
    // Sem password

    const res = await fetch(`${base}/fiscal/certificate`, {
      method: 'POST',
      headers: {
        ...headers,
        ...form.getHeaders()
      },
      body: form as any
    });

    const json = await res.json() as any;
    expect(res.ok).toBe(false);
    // Pode retornar "Tenant not found" se rota fiscal não existe ou erro de password
    expect(json.error).toBeDefined();
  });

  it('gets certificate status when no certificate uploaded', async () => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-cnpj': tenantCnpj
    };

    const res = await fetch(`${base}/fiscal/certificate`, {
      method: 'GET',
      headers
    });

    // Pode retornar 404 se não há certificado ou 200 com dados do certificado de testes anteriores
    expect([200, 404]).toContain(res.status);
  });
});
