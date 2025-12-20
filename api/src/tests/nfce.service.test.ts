import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NFCeService } from '../services/nfce.service.js';
import { prismaMaster } from '../lib/prisma.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';

vi.mock('../config/environment.js', () => ({
  config: {
    SEFAZ_NFE_ENDPOINT: 'https://nfe.fazenda.sp.gov.br',
    ALLOW_NFE_SIMULATION: true,
    isDevelopment: true,
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const invoiceUpdateMock = vi.fn();

vi.mock('../lib/tenant-prisma.js', () => ({
  withTenantPrisma: vi.fn((tenant, callback) => callback({
    invoice: { update: invoiceUpdateMock },
  })),
}));

vi.mock('../lib/prisma.js', () => {
  const tenantFiscalProfile = { findUnique: vi.fn() };
  const fiscalSeries = { update: vi.fn() };
  return {
    prismaMaster: {
      tenantFiscalProfile,
      fiscalSeries,
    },
  };
});

// Sefaz service is not exercised in simulation mode, but we stub it to be safe
vi.mock('../services/sefaz.service.js', () => ({
  SefazService: vi.fn().mockImplementation(() => ({
    loadCertificate: vi.fn(),
    autorizarNFe: vi.fn(),
  })),
}));

describe('NFCeService', () => {
  let service: NFCeService;

  const baseFiscalProfile = {
    tenantId: 'tenant-1',
    cnpj: '12345678000199',
    companyName: 'Test Co',
    tradingName: 'Test Co',
    stateRegistration: '123456',
    municipalRegistration: '987',
    address: '{}',
    cscId: '123456',
    cscToken: 'TOKEN',
    sefazEnvironment: 'homologacao',
    taxRegime: 'simple_national',
    certificatePath: '',
    certificatePassword: '',
    series: [
      { id: 'series-1', invoiceType: 'EXIT', isActive: true, seriesNumber: 1, nextNumber: 10 },
    ],
  } as any;

  const baseInvoiceData = {
    invoice: {
      id: 'inv-1',
      invoiceNumber: '0',
      operationType: 'EXIT',
      cfop: '5102',
      naturezaOperacao: 'VENDA CONSUMIDOR',
      paymentMethod: 'CASH',
      installments: 1,
      subtotal: 100,
      discount: 0,
      tax: 0,
      total: 100,
      createdAt: new Date(),
    },
    issuer: {
      cnpj: '12345678000199',
      name: 'Test Co',
      stateRegistration: '123456',
      address: '{}',
    },
    items: [
      {
        id: 'item-1',
        product: {
          id: 'prod-1',
          name: 'Produto',
          ncm: '30039000',
          unit: 'UN',
          cfop: '5102',
        },
        quantity: 1,
        unitPrice: 100,
        discount: 0,
        subtotal: 100,
        total: 100,
        icms: 0,
      },
    ],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NFCeService();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should emit NFC-e in simulation mode when no certificate', async () => {
    (prismaMaster.tenantFiscalProfile.findUnique as any).mockResolvedValue({ ...baseFiscalProfile });
    (prismaMaster.fiscalSeries.update as any).mockResolvedValue({});

    const result = await service.emitNFCe(baseInvoiceData, 'tenant-1');

    expect(result.success).toBe(true);
    expect(result.status).toBe('authorized');
    expect(result.qrCodeUrl).toBeDefined();
    expect(prismaMaster.fiscalSeries.update).toHaveBeenCalledWith({
      where: { id: 'series-1' },
      data: { nextNumber: 11 },
    });
    expect(invoiceUpdateMock).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        invoiceNumber: 10,
        series: 1,
        accessKey: expect.any(String),
        protocol: expect.any(String),
        model: '65',
      }),
    });
  });

  it('should fail when fiscal profile is missing', async () => {
    (prismaMaster.tenantFiscalProfile.findUnique as any).mockResolvedValue(null);

    await expect(service.emitNFCe(baseInvoiceData, 'tenant-1'))
      .rejects.toThrow('Fiscal profile not configured.');
  });

  it('should fail when no active series is found', async () => {
    (prismaMaster.tenantFiscalProfile.findUnique as any).mockResolvedValue({
      ...baseFiscalProfile,
      series: [],
    });

    await expect(service.emitNFCe(baseInvoiceData, 'tenant-1'))
      .rejects.toThrow('No active fiscal series found.');
  });
});
