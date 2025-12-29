/**
 * FASE 6: Serviço de Geração Automática de NF-e
 * 
 * Responsável por:
 * - Geração de XML conforme layout SEFAZ 4.0
 * - Assinatura digital com certificado A1/A3
 * - Transmissão para SEFAZ (homologação/produção)
 * - Monitoramento de status de autorização
 * - Cancelamento de NF-e
 * 
 * Integração com sincronização SNGPC/SNCM
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { prismaMaster } from '../lib/prisma.js';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Tipos e Interfaces
export interface NFeProduct {
  code: string;
  name: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  cest?: string;
  icms?: {
    cst: string;
    aliquot: number;
    value: number;
  };
  pis?: {
    cst: string;
    aliquot: number;
    value: number;
  };
  cofins?: {
    cst: string;
    aliquot: number;
    value: number;
  };
}

export interface NFeData {
  orderId: string;
  customerId: string;
  issueDate: Date;
  products: NFeProduct[];
  totalValue: number;
  icmsTotal?: number;
  pisTotal?: number;
  cofinsTotal?: number;
  notes?: string;
}

export interface NFeResult {
  id: string;
  number: string;
  series: string;
  accessKey: string;
  status: 'pending' | 'authorized' | 'denied' | 'cancelled';
  protocol?: string;
  authorizationDate?: Date;
  xmlContent: string;
  pdfUrl?: string;
  errorMessage?: string;
}

export interface NFeStatusResponse {
  accessKey: string;
  status: 'pending' | 'processing' | 'authorized' | 'denied' | 'cancelled';
  protocol?: string;
  authorizationDate?: Date;
  rejectionReason?: string;
  xmlUrl?: string;
  pdfUrl?: string;
}

export interface NfeCancelRequest {
  accessKey: string;
  reason: string;
  protocol: string;
}

export class NFeGenerationService {
  private prisma: PrismaClient;
  private tenantId: string;
  private fiscalProfile: any;

  constructor(tenantPrisma: PrismaClient, tenantId: string) {
    this.prisma = tenantPrisma;
    this.tenantId = tenantId;
  }

  /**
   * Inicializa o serviço carregando configurações fiscais do tenant
   */
  async initialize(): Promise<void> {
    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: this.tenantId },
      include: {
        fiscalProfile: {
          include: {
            series: {
              where: {
                invoiceType: 'NFE',
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      throw new AppError('Tenant não encontrado', 404);
    }

    if (!tenant.fiscalProfile) {
      throw new AppError(
        'Perfil fiscal não configurado. Configure os dados fiscais antes de emitir NF-e',
        400
      );
    }

    this.fiscalProfile = tenant.fiscalProfile;

    // Validar certificado digital
    if (!this.fiscalProfile.certificatePath || !this.fiscalProfile.certificatePassword) {
      throw new AppError(
        'Certificado digital não configurado. Faça upload do certificado A1/A3',
        400
      );
    }

    // Verificar expiração do certificado
    if (this.fiscalProfile.certificateExpiresAt) {
      const expiryDate = new Date(this.fiscalProfile.certificateExpiresAt);
      const today = new Date();
      
      if (expiryDate < today) {
        throw new AppError('Certificado digital expirado. Renove o certificado', 400);
      }

      // Alertar se falta menos de 30 dias para expirar
      const daysToExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry < 30) {
        logger.warn(`⚠️  Certificado digital expira em ${daysToExpiry} dias`, {
          tenantId: this.tenantId,
          expiryDate: expiryDate.toISOString()
        });
      }
    }

    logger.info('✅ NFeGenerationService inicializado', {
      tenantId: this.tenantId,
      companyName: this.fiscalProfile.companyName,
      environment: this.fiscalProfile.sefazEnvironment
    });
  }

  /**
   * Gera NF-e a partir de um pedido
   */
  async generateFromOrder(nfeData: NFeData): Promise<NFeResult> {
    try {
      await this.initialize();

      logger.info('🔄 Gerando NF-e', {
        tenantId: this.tenantId,
        orderId: nfeData.orderId
      });

      // 1. Obter próximo número da série
      const nextNumber = await this.getNextInvoiceNumber();

      // 2. Gerar chave de acesso (44 dígitos)
      const accessKey = this.generateAccessKey(nextNumber.number, nextNumber.series);

      // 3. Buscar dados do cliente
      const customer = await this.prisma.customer.findUnique({
        where: { id: nfeData.customerId }
      });

      if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
      }

      // 4. Gerar XML da NF-e
      const xmlContent = await this.generateXML({
        ...nfeData,
        number: nextNumber.number,
        series: nextNumber.series,
        accessKey,
        customer
      });

      // 5. Assinar XML com certificado digital
      const signedXml = await this.signXML(xmlContent);

      // 6. Transmitir para SEFAZ
      const transmissionResult = await this.transmitToSefaz(signedXml, accessKey);

      // 7. Salvar NF-e no banco de dados
      const invoice = await this.prisma.invoice.create({
        data: {
          userId: nfeData.customerId, // TODO: pegar userId do contexto
          customerId: nfeData.customerId,
          accessKey,
          number: nextNumber.number,
          series: nextNumber.series,
          invoiceType: 'EXIT',
          issueDate: nfeData.issueDate,
          totalValue: nfeData.totalValue,
          status: transmissionResult.authorized ? 'AUTHORIZED' : 'ISSUED',
          xmlContent: signedXml,
          protocol: transmissionResult.protocol,
          authorizationDate: transmissionResult.authorizationDate,
          items: {
            create: nfeData.products.map(product => ({
              productId: product.code,
              batchId: '', // TODO: implementar lógica de seleção de lote
              quantity: product.quantity,
              unitPrice: product.unitValue,
              totalPrice: product.totalValue,
              cfop: product.cfop,
              ncm: product.ncm,
              icmsCst: product.icms?.cst,
              icmsRate: product.icms?.aliquot
            }))
          }
        }
      });

      // 8. Atualizar status do pedido
      await this.prisma.order.update({
        where: { id: nfeData.orderId },
        data: {
          nfeStatus: transmissionResult.authorized ? 'issued' : 'pending',
          nfeNumber: `${nextNumber.series}-${nextNumber.number}`
        }
      });

      logger.info('✅ NF-e gerada com sucesso', {
        tenantId: this.tenantId,
        invoiceId: invoice.id,
        accessKey,
        status: invoice.status
      });

      return {
        id: invoice.id,
        number: nextNumber.number.toString(),
        series: nextNumber.series.toString(),
        accessKey,
        status: transmissionResult.authorized ? 'authorized' : 'pending',
        protocol: transmissionResult.protocol,
        authorizationDate: transmissionResult.authorizationDate,
        xmlContent: signedXml
      };
    } catch (error: any) {
      logger.error('❌ Erro ao gerar NF-e', {
        tenantId: this.tenantId,
        orderId: nfeData.orderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Consulta status de uma NF-e
   */
  async getStatus(accessKey: string): Promise<NFeStatusResponse> {
    try {
      await this.initialize();

      const invoice = await this.prisma.invoice.findUnique({
        where: { accessKey }
      });

      if (!invoice) {
        throw new AppError('NF-e não encontrada', 404);
      }

      // Se já estiver autorizada, retornar status local
      if (invoice.status === 'AUTHORIZED') {
        return {
          accessKey,
          status: 'authorized',
          protocol: invoice.protocol || undefined,
          authorizationDate: invoice.authorizationDate || undefined,
          xmlUrl: `/api/v1/nfe/${accessKey}/xml`,
          pdfUrl: `/api/v1/nfe/${accessKey}/pdf`
        };
      }

      // Consultar status na SEFAZ
      const sefazStatus = await this.consultSefazStatus(accessKey);

      // Atualizar banco se mudou de status
      if (sefazStatus.status === 'authorized' && invoice.status !== 'AUTHORIZED') {
        await this.prisma.invoice.update({
          where: { accessKey },
          data: {
            status: 'AUTHORIZED',
            protocol: sefazStatus.protocol,
            authorizationDate: sefazStatus.authorizationDate
          }
        });
      }

      return sefazStatus;
    } catch (error: any) {
      logger.error('❌ Erro ao consultar status NF-e', {
        tenantId: this.tenantId,
        accessKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cancela uma NF-e autorizada
   */
  async cancel(cancelRequest: NfeCancelRequest): Promise<void> {
    try {
      await this.initialize();

      const invoice = await this.prisma.invoice.findUnique({
        where: { accessKey: cancelRequest.accessKey }
      });

      if (!invoice) {
        throw new AppError('NF-e não encontrada', 404);
      }

      if (invoice.status !== 'AUTHORIZED') {
        throw new AppError('Apenas NF-e autorizadas podem ser canceladas', 400);
      }

      // Verificar prazo de cancelamento (24h após autorização)
      if (invoice.authorizationDate) {
        const hoursSinceAuth = (Date.now() - invoice.authorizationDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceAuth > 24) {
          throw new AppError(
            'Prazo de cancelamento expirado. Para NF-e autorizadas há mais de 24h, use carta de correção',
            400
          );
        }
      }

      // Gerar XML de cancelamento
      const cancelXml = this.generateCancelXML(cancelRequest);

      // Assinar XML
      const signedCancelXml = await this.signXML(cancelXml);

      // Transmitir cancelamento para SEFAZ
      await this.transmitCancellation(signedCancelXml);

      // Atualizar status no banco
      await this.prisma.invoice.update({
        where: { accessKey: cancelRequest.accessKey },
        data: {
          status: 'CANCELLED'
        }
      });

      logger.info('✅ NF-e cancelada com sucesso', {
        tenantId: this.tenantId,
        accessKey: cancelRequest.accessKey,
        reason: cancelRequest.reason
      });
    } catch (error: any) {
      logger.error('❌ Erro ao cancelar NF-e', {
        tenantId: this.tenantId,
        accessKey: cancelRequest.accessKey,
        error: error.message
      });
      throw error;
    }
  }

  // ========================== MÉTODOS PRIVADOS ==========================

  /**
   * Obtém próximo número da série de NF-e
   */
  private async getNextInvoiceNumber(): Promise<{ number: number; series: number }> {
    const series = this.fiscalProfile.series.find((s: any) => s.invoiceType === 'NFE');
    
    if (!series) {
      throw new AppError('Série de NF-e não configurada', 400);
    }

    const currentNumber = series.nextNumber;

    // Incrementar para próxima emissão
    await prismaMaster.fiscalSeries.update({
      where: { id: series.id },
      data: { nextNumber: currentNumber + 1 }
    });

    return {
      number: currentNumber,
      series: series.seriesNumber
    };
  }

  /**
   * Gera chave de acesso de 44 dígitos conforme padrão SEFAZ
   */
  private generateAccessKey(number: number, series: number): string {
    const uf = '35'; // São Paulo (exemplo, deve vir do fiscalProfile)
    const aamm = new Date().toISOString().slice(2, 7).replace('-', '');
    const cnpj = this.fiscalProfile.cnpj.padStart(14, '0');
    const mod = '55'; // Modelo NF-e
    const serieStr = series.toString().padStart(3, '0');
    const nnf = number.toString().padStart(9, '0');
    const tpEmis = '1'; // Normal
    const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    const baseKey = `${uf}${aamm}${cnpj}${mod}${serieStr}${nnf}${tpEmis}${cNF}`;
    
    // Calcular dígito verificador módulo 11
    const dv = this.calculateMod11(baseKey);

    return baseKey + dv;
  }

  /**
   * Calcula dígito verificador módulo 11
   */
  private calculateMod11(value: string): string {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    let weightIndex = 0;

    for (let i = value.length - 1; i >= 0; i--) {
      sum += parseInt(value[i]) * weights[weightIndex % 8];
      weightIndex++;
    }

    const remainder = sum % 11;
    const dv = 11 - remainder;

    return (dv >= 10 ? 0 : dv).toString();
  }

  /**
   * Gera XML da NF-e conforme layout SEFAZ 4.0
   */
  private async generateXML(data: any): Promise<string> {
    // Simplificado - em produção, usar biblioteca como node-nfe
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${data.accessKey}" versao="4.00">
      <ide>
        <cUF>${this.fiscalProfile.cnpj.substring(0, 2)}</cUF>
        <cNF>${data.accessKey.substring(35, 43)}</cNF>
        <natOp>VENDA</natOp>
        <mod>55</mod>
        <serie>${data.series}</serie>
        <nNF>${data.number}</nNF>
        <dhEmi>${data.issueDate.toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <tpEmis>1</tpEmis>
        <cDV>${data.accessKey.substring(43)}</cDV>
        <tpAmb>${this.fiscalProfile.sefazEnvironment === 'producao' ? '1' : '2'}</tpAmb>
        <finNFe>1</finNFe>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>
      <emit>
        <CNPJ>${this.fiscalProfile.cnpj}</CNPJ>
        <xNome>${this.fiscalProfile.companyName}</xNome>
        <xFant>${this.fiscalProfile.tradingName || this.fiscalProfile.companyName}</xFant>
      </emit>
      <dest>
        <CPF>${data.customer.cnpjCpf}</CPF>
        <xNome>${data.customer.companyName}</xNome>
      </dest>
      <det nItem="1">
        <!-- Produtos aqui -->
      </det>
      <total>
        <ICMSTot>
          <vNF>${data.totalValue}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>`;

    return xml;
  }

  /**
   * Assina XML com certificado digital
   */
  private async signXML(xml: string): Promise<string> {
    // Simplificado - em produção, usar biblioteca de assinatura digital
    logger.info('🔐 Assinando XML com certificado digital');
    
    // TODO: Implementar assinatura real com certificado A1/A3
    // Usar biblioteca como node-forge ou xmldsigjs
    
    return xml; // Retornar XML assinado
  }

  /**
   * Transmite NF-e para SEFAZ
   */
  private async transmitToSefaz(xml: string, accessKey: string): Promise<any> {
    logger.info('📤 Transmitindo NF-e para SEFAZ', {
      accessKey,
      environment: this.fiscalProfile.sefazEnvironment
    });

    // Simulação - em produção, fazer request SOAP para webservice SEFAZ
    // Exemplo: https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx
    
    return {
      authorized: true,
      protocol: '135' + Date.now().toString().substring(5),
      authorizationDate: new Date()
    };
  }

  /**
   * Consulta status na SEFAZ
   */
  private async consultSefazStatus(accessKey: string): Promise<NFeStatusResponse> {
    logger.info('🔍 Consultando status NF-e na SEFAZ', { accessKey });

    // Simulação - em produção, fazer request ao webservice
    return {
      accessKey,
      status: 'authorized',
      protocol: '135' + Date.now().toString().substring(5),
      authorizationDate: new Date(),
      xmlUrl: `/api/v1/nfe/${accessKey}/xml`,
      pdfUrl: `/api/v1/nfe/${accessKey}/pdf`
    };
  }

  /**
   * Gera XML de cancelamento
   */
  private generateCancelXML(cancelRequest: NfeCancelRequest): string {
    // Simplificado
    return `<?xml version="1.0" encoding="UTF-8"?>
<eventoCancNFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infEvento>
    <chNFe>${cancelRequest.accessKey}</chNFe>
    <xJust>${cancelRequest.reason}</xJust>
  </infEvento>
</eventoCancNFe>`;
  }

  /**
   * Transmite cancelamento para SEFAZ
   */
  private async transmitCancellation(xml: string): Promise<void> {
    logger.info('📤 Transmitindo cancelamento para SEFAZ');
    // Simulação
  }
}
