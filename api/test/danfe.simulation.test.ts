import { describe, it, expect } from 'vitest';
import { generateDanfePdf } from '../src/utils/danfePdf';

// Minimal DANFEData mock for simulation mode
const mockData: any = {
  id: 'inv-sim-1',
  tenant: { name: 'Tenant Simulado', cnpj: '12.345.678/0001-55', stateRegistration: '123456789' },
  customer: { name: 'Cliente Teste', cnpjCpf: '12345678901' },
  invoice: {
    invoiceNumber: '1001',
    subtotal: 100,
    discount: 0,
    total: 100,
    createdAt: new Date()
  },
  items: [
    {
      product: { name: 'Produto A', unit: 'UN', ncm: '30039000', cfop: '5102' },
      quantity: 2,
      unitPrice: 50,
      total: 100,
      discount: 0,
      subtotal: 100
    }
  ],
  nfe: {
    accessKey: 'SIMULATED123456789012345678901234567890123456789012',
    protocolNumber: 'SIM-123456',
    status: 'authorized',
    sefazResponse: { simulation: true }
  }
};

describe('DANFE Simulation PDF', () => {
  it('generates valid PDF (simulation)', async () => {
    const pdf = await generateDanfePdf(mockData);
    // Basic PDF header check
    expect(pdf.slice(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
