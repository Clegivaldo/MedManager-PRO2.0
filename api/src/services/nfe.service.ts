import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { prismaMaster } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { signXml, validateCertificate } from '../utils/xmlSigner.js';
import { buildNFeXml, generateAccessKey, type NFeXmlData } from '../utils/nfeXmlBuilder.js';
import { decryptCertificate } from '../utils/certificate.js';
import { SefazService, type SefazConfig } from './sefaz.service.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Interface para dados da NF-e conforme usado nas rotas
 */
export interface NFeInvoiceData {
  invoice: {
    id: string;
    invoiceNumber: string;
    operationType: string;
    cfop: string;
    naturezaOperacao: string;
    paymentMethod: string;
    installments: number;
    observations?: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    createdAt: Date;
  };
  issuer: {
    cnpj: string;
    name: string;
    stateRegistration: string;
    municipalRegistration?: string;
    address: string;
    phone?: string;
    email?: string;
  };
  customer: {
    id: string;
    name: string;
    cnpjCpf: string;
    email?: string;
    phone?: string;
    address?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    customerType?: string;
  };
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      ncm: string;
      unit: string;
      gtin?: string;
      registrationNumber?: string;
      controlledSubstance?: boolean;
      requiresPrescription?: boolean;
      requiresTemperatureControl?: boolean;
      temperatureRange?: string;
      cest?: string;
      cfop: string;
    };
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
    total: number;
    icms: number;
    batch?: {
      id: string;
      batchNumber: string;
      expirationDate: Date;
      manufacturingDate?: Date;
    };
  }>;
  payments?: Array<{
    method: string;
    amount: number;
    status: string;
  }>;
}

/**
 * Interface para cancelamento de NF-e
 */
export interface CancelNFeData {
  accessKey: string;
  protocolNumber: string;
  justification: string;
  cnpj: string;
}

/**
 * Interface para consulta de status
 */
export interface NFeStatusData {
  accessKey: string;
}

/**
 * Interface para resposta da Sefaz
 */
export interface SefazResponse {
  success: boolean;
  accessKey?: string;
  protocolNumber?: string;
  authorizationDate?: Date;
  status: string;
  statusCode?: string;
  statusMessage?: string;
  xmlContent?: string;
  xml?: string;
  danfeUrl?: string;
  qrCodeUrl?: string;
  sefazResponse?: any;
  errorDetails?: string;
  details?: any;
  cancellationDate?: Date;
  cancellationProtocol?: string;
  cancellationJustification?: string;
}

/**
 * Interface para DANFE
 */
export interface DANFEData {
  id: string;
  customer: any;
  items: any[];
  nfe: any;
  tenant: any;
  invoice: {
    invoiceNumber: string;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: Date;
  };
}

/**
 * Serviço de integração com Sefaz para emissão de NF-e
 */
export class NFeService {
  private readonly sefazEndpoint: string;
  private readonly certificatePath: string;
  private readonly certificatePassword: string;

  constructor() {
    this.sefazEndpoint = config.SEFAZ_NFE_ENDPOINT || 'https://nfe.fazenda.sp.gov.br';
    this.certificatePath = config.SEFAZ_CERT_PATH || '';
    this.certificatePassword = config.SEFAZ_CERT_PASSWORD || '';
  }

  /**
   * Emite uma NF-e na Sefaz
   */
  async emitNFe(nfeData: NFeInvoiceData, tenantId: string): Promise<SefazResponse> {
    try {
      logger.info(`Starting NFe emission`, {
        invoiceNumber: nfeData.invoice.invoiceNumber,
        total: nfeData.invoice.total,
        items: nfeData.items.length,
        tenantId
      });

      // Buscar perfil fiscal do tenant
      const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
        where: { tenantId },
        include: { series: true }
      });

      if (!fiscalProfile) {
        throw new AppError('Fiscal profile not configured. Configure it in System Settings first.', 400);
      }

      // Validar dados da NF-e
      this.validateNFeData(nfeData);

      // Buscar série ativa para emissão
      const activeSeries = fiscalProfile.series.find(
        (s) => s.invoiceType === 'EXIT' && s.isActive
      );

      if (!activeSeries) {
        throw new AppError('No active fiscal series found for EXIT invoices', 400);
      }

      // Incrementar número da série
      const nextNumber = activeSeries.nextNumber;
      await prismaMaster.fiscalSeries.update({
        where: { id: activeSeries.id },
        data: { nextNumber: nextNumber + 1 }
      });

      // Gerar XML da NF-e usando o perfil fiscal
      const nfeXml = await this.generateNFeXml(nfeData, fiscalProfile, activeSeries.seriesNumber, nextNumber);

      // Assinar digitalmente o XML com certificado do perfil
      const signedXml = await this.signXml(nfeXml, fiscalProfile);

      // Enviar para Sefaz usando CSC do perfil
      const sefazResponse = await this.sendToSefaz(signedXml, nfeData, fiscalProfile);

      logger.info(`NFe emission completed`, {
        accessKey: sefazResponse.accessKey,
        protocolNumber: sefazResponse.protocolNumber,
        status: sefazResponse.status,
        seriesNumber: activeSeries.seriesNumber,
        invoiceNumber: nextNumber
      });

      return sefazResponse;

    } catch (error) {
      logger.error(`NFe emission failed`, {
        invoiceNumber: nfeData.invoice.invoiceNumber,
        error: (error as Error).message
      });

      throw new AppError(`NFe emission failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Valida dados da NF-e antes da emissão
   */
  private validateNFeData(nfeData: NFeInvoiceData): void {
    // Validar campos obrigatórios
    if (!nfeData.invoice || !nfeData.invoice.invoiceNumber) {
      throw new AppError('Missing invoice number', 400);
    }

    if (!nfeData.customer || !nfeData.customer.cnpjCpf) {
      throw new AppError('Missing customer CNPJ/CPF', 400);
    }

    if (!nfeData.issuer || !nfeData.issuer.cnpj) {
      throw new AppError('Missing issuer CNPJ', 400);
    }

    if (!nfeData.items || nfeData.items.length === 0) {
      throw new AppError('NFe must have at least one item', 400);
    }

    if (nfeData.invoice.total <= 0) {
      throw new AppError('Invoice total must be greater than zero', 400);
    }

    // Validar itens da NF-e
    for (const item of nfeData.items) {
      if (!item.product || !item.quantity || !item.unitPrice || !item.total) {
        throw new AppError('Invalid NFe item data', 400);
      }

      if (item.quantity <= 0) {
        throw new AppError('Item quantity must be greater than zero', 400);
      }

      if (item.unitPrice <= 0) {
        throw new AppError('Item unit price must be greater than zero', 400);
      }

      // Validações específicas para medicamentos (RDC 430)
      if (item.product.controlledSubstance && !item.batch) {
        throw new AppError('Controlled substance items require batch information', 400);
      }

      if (item.product.requiresTemperatureControl && !item.product.temperatureRange) {
        throw new AppError('Temperature controlled products require temperature range', 400);
      }

      if (item.batch && item.batch.expirationDate < new Date()) {
        throw new AppError('Cannot sell expired products', 400);
      }
    }

    // Validar CFOP
    if (!nfeData.invoice.cfop || nfeData.invoice.cfop.length !== 4) {
      throw new AppError('Invalid CFOP code', 400);
    }
  }

  /**
   * Gera XML da NF-e usando o builder estruturado
   */
  private async generateNFeXml(
    nfeData: NFeInvoiceData,
    fiscalProfile: any,
    seriesNumber: number,
    invoiceNumber: number
  ): Promise<string> {
    // Gerar código numérico aleatório (cNF) e chave de acesso
    const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const now = new Date();
    const aamm = (now.getFullYear() % 100).toString().padStart(2, '0') + 
                 (now.getMonth() + 1).toString().padStart(2, '0');
    
    const accessKey = generateAccessKey({
      cUF: '35', // SP - usar código do estado do emitente
      aamm,
      cnpj: fiscalProfile.cnpj.replace(/\D/g, ''),
      mod: '55',
      serie: seriesNumber.toString(),
      nNF: invoiceNumber.toString(),
      tpEmis: '1',
      cNF,
    });

    // Determinar ambiente e regime tributário
    const tpAmb = fiscalProfile.sefazEnvironment === 'producao' ? '1' : '2' as '1' | '2';
    const crt = fiscalProfile.taxRegime === 'simple_national' ? '1' 
              : fiscalProfile.taxRegime === 'real_profit' ? '3' 
              : '2' as '1' | '2' | '3';

    // Parse address if stored as JSON
    const address = typeof fiscalProfile.address === 'string' 
      ? JSON.parse(fiscalProfile.address) 
      : fiscalProfile.address || {};

    const customerAddr = typeof nfeData.customer.address === 'string'
      ? JSON.parse(nfeData.customer.address)
      : nfeData.customer.address || {};

    // Construir dados estruturados para o builder
    const xmlData: NFeXmlData = {
      ide: {
        cUF: '35', // SP
        natOp: nfeData.invoice.naturezaOperacao,
        mod: '55',
        serie: seriesNumber.toString(),
        nNF: invoiceNumber.toString(),
        dhEmi: nfeData.invoice.createdAt.toISOString(),
        tpNF: '1',
        idDest: '1',
        cMunFG: '3550308', // São Paulo
        tpImp: '1',
        tpEmis: '1',
        tpAmb,
        finNFe: '1',
        indFinal: '1',
        indPres: '1',
        procEmi: '0',
        verProc: 'MedManager 2.0',
      },
      emit: {
        CNPJ: fiscalProfile.cnpj.replace(/\D/g, ''),
        xNome: fiscalProfile.companyName,
        xFant: fiscalProfile.tradingName,
        IE: fiscalProfile.stateRegistration || '',
        IM: fiscalProfile.municipalRegistration,
        CRT: crt,
        enderEmit: {
          xLgr: address.street || 'Rua Principal',
          nro: address.number || 'S/N',
          xCpl: address.complement,
          xBairro: address.district || 'Centro',
          cMun: address.cityCode || '3550308',
          xMun: address.city || 'São Paulo',
          UF: address.state || 'SP',
          CEP: (address.zipCode || '01000000').replace(/\D/g, ''),
          cPais: '1058',
          xPais: 'BRASIL',
          fone: fiscalProfile.phone?.replace(/\D/g, ''),
        },
      },
      dest: {
        CNPJ: nfeData.customer.cnpjCpf.length > 11 ? nfeData.customer.cnpjCpf.replace(/\D/g, '') : undefined,
        CPF: nfeData.customer.cnpjCpf.length <= 11 ? nfeData.customer.cnpjCpf.replace(/\D/g, '') : undefined,
        xNome: nfeData.customer.name,
        indIEDest: '9',
        IE: nfeData.customer.stateRegistration,
        email: nfeData.customer.email,
        enderDest: {
          xLgr: customerAddr.street || 'Rua Desconhecida',
          nro: customerAddr.number || 'S/N',
          xCpl: customerAddr.complement,
          xBairro: customerAddr.district || 'Centro',
          cMun: customerAddr.cityCode || '3550308',
          xMun: customerAddr.city || 'São Paulo',
          UF: customerAddr.state || 'SP',
          CEP: (customerAddr.zipCode || '01000000').replace(/\D/g, ''),
          cPais: '1058',
          xPais: 'BRASIL',
          fone: nfeData.customer.phone?.replace(/\D/g, ''),
        },
      },
      det: nfeData.items.map((item, index) => ({
        nItem: (index + 1).toString(),
        prod: {
          cProd: item.product.id,
          cEAN: item.product.gtin,
          xProd: item.product.name,
          NCM: item.product.ncm || '3003.90.00',
          CFOP: item.product.cfop,
          uCom: item.product.unit,
          qCom: item.quantity.toFixed(4),
          vUnCom: item.unitPrice.toFixed(4),
          vProd: item.total.toFixed(2),
          uTrib: item.product.unit,
          qTrib: item.quantity.toFixed(4),
          vUnTrib: item.unitPrice.toFixed(4),
          vDesc: item.discount > 0 ? item.discount.toFixed(2) : undefined,
          indTot: '1',
        },
        imposto: {
          ICMS: {
            ICMSSN102: {
              orig: '0',
              CSOSN: '102',
            },
          },
          PIS: {
            PISOutr: {
              CST: '99',
              vPIS: '0.00',
            },
          },
          COFINS: {
            COFINSOutr: {
              CST: '99',
              vCOFINS: '0.00',
            },
          },
        },
      })),
      total: {
        ICMSTot: {
          vBC: '0.00',
          vICMS: '0.00',
          vICMSDeson: '0.00',
          vFCP: '0.00',
          vBCST: '0.00',
          vST: '0.00',
          vFCPST: '0.00',
          vFCPSTRet: '0.00',
          vProd: nfeData.invoice.subtotal.toFixed(2),
          vFrete: '0.00',
          vSeg: '0.00',
          vDesc: nfeData.invoice.discount.toFixed(2),
          vII: '0.00',
          vIPI: '0.00',
          vIPIDevol: '0.00',
          vPIS: '0.00',
          vCOFINS: '0.00',
          vOutro: '0.00',
          vNF: nfeData.invoice.total.toFixed(2),
        },
      },
      transp: {
        modFrete: '9',
      },
      pag: {
        detPag: [{
          tPag: this.getPaymentMethodCode(nfeData.invoice.paymentMethod),
          vPag: nfeData.invoice.total.toFixed(2),
        }],
      },
      infAdic: nfeData.invoice.observations ? {
        infCpl: nfeData.invoice.observations,
      } : undefined,
    };

    // Gerar XML usando o builder
    const xml = buildNFeXml(xmlData, accessKey);

    return xml;
  }



  /**
   * Assina digitalmente o XML usando certificado A1
   */
  private async signXml(xml: string, fiscalProfile: any): Promise<string> {
    logger.info('Signing NFe XML', { 
      xmlLength: xml.length,
      certificateType: fiscalProfile.certificateType,
      hasCertificatePath: !!fiscalProfile.certificatePath 
    });

    // Verificar se certificado A1 está configurado
    if (!fiscalProfile.certificateType || fiscalProfile.certificateType !== 'A1') {
      throw new AppError('Only A1 certificate is currently supported for digital signature', 400);
    }

    if (!fiscalProfile.certificatePath || !fiscalProfile.certificatePassword) {
      throw new AppError('Certificate path and password are required for signing', 400);
    }

    try {
      // Ler certificado .pfx criptografado do disco (formato base64)
      const encryptedPfxBase64 = await fs.readFile(fiscalProfile.certificatePath, 'utf-8');

      // Descriptografar certificado usando AES-256-GCM
      const pfxBuffer = decryptCertificate(encryptedPfxBase64.trim());

      // Validar certificado antes de usar
      const validation = validateCertificate(pfxBuffer, fiscalProfile.certificatePassword);
      if (!validation.valid) {
        throw new AppError(`Invalid certificate: ${validation.error}`, 400);
      }

      if (validation.expiresAt && validation.expiresAt < new Date()) {
        throw new AppError('Certificate has expired', 400);
      }

      logger.info('Certificate validated', {
        expiresAt: validation.expiresAt,
        subject: validation.subject,
        issuer: validation.issuer,
      });

      // Assinar XML usando node-forge
      const signatureResult = signXml({
        xml,
        pfxBuffer,
        pfxPassword: fiscalProfile.certificatePassword,
      });

      logger.info('XML signed successfully', {
        digestValue: signatureResult.digestValue,
        signatureLength: signatureResult.signatureValue.length,
      });

      return signatureResult.signedXml;

    } catch (error) {
      logger.error('XML signing failed', {
        error: (error as Error).message,
        certificatePath: fiscalProfile.certificatePath,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(`XML signing failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Envia XML para Sefaz usando o SefazService
   */
  private async sendToSefaz(xml: string, nfeData: NFeInvoiceData, fiscalProfile: any): Promise<SefazResponse> {
    const environment = fiscalProfile.sefazEnvironment === 'producao' ? 'production' : 'homologation';
    
    logger.info('Sending NFe to Sefaz', {
      endpoint: this.sefazEndpoint,
      environment,
      invoiceNumber: nfeData.invoice.invoiceNumber,
      total: nfeData.invoice.total,
      cscId: fiscalProfile.cscId
    });

    try {
      // Configurar SefazService
      const sefazConfig: SefazConfig = {
        environment,
        state: 'SP', // Por padrão SP, pode ser configurado por tenant
        certificatePath: fiscalProfile.certificatePath || undefined,
        certificatePassword: fiscalProfile.certificatePassword || undefined
      };

      const sefazService = new SefazService(sefazConfig);

      // Carregar certificado se necessário
      if (fiscalProfile.certificatePath) {
        await sefazService.loadCertificate();
      }

      // Gerar ID do lote
      const idLote = Date.now().toString();

      // Extrair chave de acesso do XML
      const accessKeyMatch = xml.match(/NFe(\d{44})/);
      const accessKey = accessKeyMatch ? accessKeyMatch[1] : '';

      if (!accessKey) {
        throw new AppError('Failed to extract access key from XML', 500);
      }

      // Enviar para autorização
      logger.info('Authorizing NFe with Sefaz', { accessKey, idLote });
      const authResponse = await sefazService.autorizarNFe(xml, idLote);

      if (authResponse.status === 'processing' && authResponse.recibo) {
        // Aguardar processamento assíncrono
        logger.info('NFe in processing, waiting for result', { recibo: authResponse.recibo });
        
        let attempts = 0;
        const maxAttempts = 10;
        let receiptResponse = authResponse;

        while (receiptResponse.status === 'processing' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s
          receiptResponse = await sefazService.consultarRecibo(authResponse.recibo!);
          attempts++;
        }

        if (receiptResponse.status === 'success') {
          return {
            success: true,
            accessKey,
            protocolNumber: receiptResponse.protocol,
            authorizationDate: new Date(),
            status: 'authorized',
            statusCode: receiptResponse.statusCode,
            statusMessage: receiptResponse.statusMessage,
            xmlContent: xml,
            xml: receiptResponse.xml,
            danfeUrl: `https://nfe.fazenda.sp.gov.br/danfe/${accessKey}.pdf`,
            qrCodeUrl: fiscalProfile.cscId ? `https://nfe.fazenda.sp.gov.br/qrcode/${accessKey}.png` : undefined,
            sefazResponse: receiptResponse
          };
        } else {
          return {
            success: false,
            accessKey,
            status: 'denied',
            statusCode: receiptResponse.statusCode,
            statusMessage: receiptResponse.statusMessage,
            errorDetails: receiptResponse.errors?.join(', '),
            sefazResponse: receiptResponse
          };
        }
      } else if (authResponse.status === 'success') {
        // Autorização síncrona
        return {
          success: true,
          accessKey,
          protocolNumber: authResponse.protocol,
          authorizationDate: new Date(),
          status: 'authorized',
          statusCode: authResponse.statusCode,
          statusMessage: authResponse.statusMessage,
          xmlContent: xml,
          xml: authResponse.xml,
          danfeUrl: `https://nfe.fazenda.sp.gov.br/danfe/${accessKey}.pdf`,
          qrCodeUrl: fiscalProfile.cscId ? `https://nfe.fazenda.sp.gov.br/qrcode/${accessKey}.png` : undefined,
          sefazResponse: authResponse
        };
      } else {
        // Erro na autorização
        return {
          success: false,
          accessKey,
          status: 'denied',
          statusCode: authResponse.statusCode,
          statusMessage: authResponse.statusMessage,
          errorDetails: authResponse.errors?.join(', '),
          sefazResponse: authResponse
        };
      }

    } catch (error) {
      logger.error('Sefaz communication error', { error: (error as Error).message });

      // Fallback para modo de contingência ou retornar erro
      const accessKeyMatch = xml.match(/NFe(\d{44})/);
      const accessKey = accessKeyMatch ? accessKeyMatch[1] : 'ERROR' + Date.now();

      return {
        success: false,
        accessKey,
        status: 'error',
        statusCode: '999',
        statusMessage: 'Erro de comunicação com Sefaz',
        errorDetails: (error as Error).message,
        sefazResponse: { error: (error as Error).message }
      };
    }
  }

  /**
   * Cancela uma NF-e autorizada usando SefazService
   */
  async cancelNFe(cancelData: CancelNFeData, tenantId: string): Promise<SefazResponse> {
    try {
      logger.info(`Canceling NFe`, { 
        accessKey: cancelData.accessKey, 
        protocolNumber: cancelData.protocolNumber 
      });

      // Buscar perfil fiscal do tenant
      const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
        where: { tenantId }
      });

      if (!fiscalProfile) {
        throw new AppError('Fiscal profile not configured', 400);
      }

      // Configurar SefazService
      const environment = fiscalProfile.sefazEnvironment === 'producao' ? 'production' : 'homologation';
      const sefazConfig: SefazConfig = {
        environment,
        state: 'SP',
        certificatePath: fiscalProfile.certificatePath || undefined,
        certificatePassword: fiscalProfile.certificatePassword || undefined
      };

      const sefazService = new SefazService(sefazConfig);

      // Carregar certificado
      if (fiscalProfile.certificatePath) {
        await sefazService.loadCertificate();
      }

      // Enviar cancelamento
      const cancelResponse = await sefazService.cancelarNFe(
        cancelData.accessKey,
        cancelData.protocolNumber,
        cancelData.justification,
        cancelData.cnpj
      );

      if (cancelResponse.status === 'success') {
        logger.info(`NFe canceled successfully`, { 
          accessKey: cancelData.accessKey,
          cancellationProtocol: cancelResponse.protocol 
        });

        return {
          success: true,
          accessKey: cancelData.accessKey,
          protocolNumber: cancelResponse.protocol,
          authorizationDate: new Date(),
          status: 'cancelled',
          statusCode: cancelResponse.statusCode,
          statusMessage: cancelResponse.statusMessage,
          cancellationDate: new Date(),
          cancellationProtocol: cancelResponse.protocol,
          cancellationJustification: cancelData.justification
        };
      } else {
        return {
          success: false,
          accessKey: cancelData.accessKey,
          status: 'error',
          statusCode: cancelResponse.statusCode,
          statusMessage: cancelResponse.statusMessage,
          errorDetails: cancelResponse.statusMessage
        };
      }

    } catch (error) {
      logger.error(`NFe cancellation failed`, { 
        accessKey: cancelData.accessKey, 
        error: (error as Error).message 
      });
      
      throw new AppError(`NFe cancellation failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Consulta status de uma NF-e na Sefaz usando SefazService
   */
  async consultarStatusNFe(accessKey: string, tenantId: string): Promise<SefazResponse> {
    try {
      logger.info(`Consulting NFe status`, { accessKey });

      // Buscar perfil fiscal do tenant
      const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
        where: { tenantId }
      });

      if (!fiscalProfile) {
        throw new AppError('Fiscal profile not configured', 400);
      }

      // Configurar SefazService
      const environment = fiscalProfile.sefazEnvironment === 'producao' ? 'production' : 'homologation';
      const sefazConfig: SefazConfig = {
        environment,
        state: 'SP',
        certificatePath: fiscalProfile.certificatePath || undefined,
        certificatePassword: fiscalProfile.certificatePassword || undefined
      };

      const sefazService = new SefazService(sefazConfig);

      // Carregar certificado
      if (fiscalProfile.certificatePath) {
        await sefazService.loadCertificate();
      }

      // Consultar protocolo
      const consultaResponse = await sefazService.consultarProtocolo(accessKey);

      logger.info(`NFe status consultation completed`, { 
        accessKey,
        status: consultaResponse.status 
      });

      return {
        success: consultaResponse.status === 'authorized',
        accessKey,
        status: consultaResponse.status,
        statusCode: consultaResponse.statusCode,
        statusMessage: consultaResponse.statusMessage,
        protocolNumber: consultaResponse.protocol,
        authorizationDate: consultaResponse.authorizationDate,
        xml: consultaResponse.xml,
        details: {
          consultationDate: new Date(),
          sefazStatus: consultaResponse.status,
          authorizationDate: consultaResponse.authorizationDate
        }
      };

    } catch (error) {
      logger.error(`NFe status consultation failed`, { 
        accessKey, 
        error: (error as Error).message 
      });
      
      throw new AppError(`NFe status consultation failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Gera DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
   */
  async generateDANFE(invoiceData: DANFEData): Promise<Buffer> {
    try {
      logger.info(`Generating DANFE`, { 
        invoiceId: invoiceData.id,
        accessKey: invoiceData.nfe?.accessKey 
      });

      if (!invoiceData.nfe || invoiceData.nfe.status !== 'authorized') {
        throw new AppError('NF-e must be authorized to generate DANFE', 400);
      }

      // Em produção, gerar PDF real do DANFE
      // Por enquanto, retornar um buffer simulado
      const simulatedPdfContent = `DANFE - Documento Auxiliar da Nota Fiscal Eletrônica

================================================================================
EMITENTE: ${invoiceData.tenant.name}
CNPJ: ${invoiceData.tenant.cnpj}
INSCRIÇÃO ESTADUAL: ${invoiceData.tenant.stateRegistration}
================================================================================

DESTINATÁRIO: ${invoiceData.customer.name}
CNPJ/CPF: ${invoiceData.customer.cnpjCpf}

================================================================================
NOTA FISCAL ELETRÔNICA
Número: ${invoiceData.invoice.invoiceNumber}
Série: 1
Data de Emissão: ${invoiceData.invoice.createdAt.toLocaleDateString('pt-BR')}
Chave de Acesso: ${invoiceData.nfe.accessKey}
Protocolo: ${invoiceData.nfe.protocolNumber}

================================================================================
ITENS DA NOTA FISCAL:
${invoiceData.items.map((item, index) => `${index + 1}. ${item.product.name} - ${item.quantity} ${item.product.unit} x R$ ${item.unitPrice.toFixed(2)} = R$ ${item.total.toFixed(2)}`).join('\n')}

================================================================================
RESUMO:
Subtotal: R$ ${invoiceData.invoice.subtotal.toFixed(2)}
Desconto: R$ ${invoiceData.invoice.discount.toFixed(2)}
Total: R$ ${invoiceData.invoice.total.toFixed(2)}

================================================================================
Consulta de autenticidade no portal nacional da NF-e
www.nfe.fazenda.gov.br/portal
Chave de acesso: ${invoiceData.nfe.accessKey}

Este documento foi emitido em ambiente de ${config.NODE_ENV === 'development' ? 'HOMOLOGAÇÃO' : 'PRODUÇÃO'}.
`;

      logger.info(`DANFE generated successfully`, { 
        invoiceId: invoiceData.id,
        accessKey: invoiceData.nfe.accessKey 
      });

      return Buffer.from(simulatedPdfContent, 'utf-8');

    } catch (error) {
      logger.error(`DANFE generation failed`, { 
        invoiceId: invoiceData.id, 
        error: (error as Error).message 
      });
      
      throw new AppError(`DANFE generation failed: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Obtém código de pagamento para NF-e
   */
  private getPaymentMethodCode(paymentMethod: string): string {
    const paymentCodes: { [key: string]: string } = {
      'cash': '01',
      'check': '02',
      'credit_card': '03',
      'debit_card': '04',
      'credit': '05',
      'store_credit': '10',
      'food_voucher': '11',
      'meal_voucher': '12',
      'bank_transfer': '15',
      'billet': '15',
      'boleto': '15',
      'pix': '17'
    };

    return paymentCodes[paymentMethod] || '99';
  }
}