/**
 * FASE 7: Serviço de Relatórios ANVISA
 * 
 * Responsável por:
 * - Geração de relatórios certificados para ANVISA
 * - Exportação padronizada de Guia 33
 * - Verificação de conformidade SNGPC/SNCM
 * - Trilha de auditoria regulatória
 * - Validação de integridade de dados
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import * as crypto from 'crypto';
import { format } from 'date-fns';

export interface AnvisaReportFilter {
  startDate: Date;
  endDate: Date;
  reportType: 'GUIA33' | 'SNGPC' | 'SNCM' | 'FULL_COMPLIANCE';
  includeArchived?: boolean;
}

export interface Guia33Record {
  substanceName: string;
  registrationNumber: string;
  batchNumber: string;
  openingBalance: number;
  entries: number;
  exits: number;
  closingBalance: number;
  movements: Array<{
    date: Date;
    type: 'ENTRY' | 'EXIT';
    quantity: number;
    document: string;
    party: string; // Cliente ou Fornecedor
  }>;
}

export interface SngpcComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  pendingSubmissions: number;
  controlledSubstances: number;
  totalMovements: number;
  complianceRate: number; // %
  issues: Array<{
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    resolution?: string;
  }>;
}

export interface AnvisaReportResult {
  id: string;
  reportType: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  checksum: string; // Hash SHA-256 para garantir integridade
  data: any;
  exportFormats: string[]; // ['json', 'csv', 'pdf', 'xml']
}

export class AnvisaReportsService {
  private prisma: PrismaClient;
  private tenantId: string;

  constructor(tenantPrisma: PrismaClient, tenantId: string) {
    this.prisma = tenantPrisma;
    this.tenantId = tenantId;
  }

  /**
   * Gera relatório completo de conformidade ANVISA
   */
  async generateComplianceReport(filter: AnvisaReportFilter): Promise<AnvisaReportResult> {
    try {
      logger.info('🔄 Gerando relatório de conformidade ANVISA', {
        tenantId: this.tenantId,
        reportType: filter.reportType,
        period: {
          start: filter.startDate,
          end: filter.endDate
        }
      });

      let reportData: any;

      switch (filter.reportType) {
        case 'GUIA33':
          reportData = await this.generateGuia33Report(filter.startDate, filter.endDate);
          break;
        case 'SNGPC':
          reportData = await this.generateSngpcReport(filter.startDate, filter.endDate);
          break;
        case 'SNCM':
          reportData = await this.generateSncmReport(filter.startDate, filter.endDate);
          break;
        case 'FULL_COMPLIANCE':
          reportData = await this.generateFullComplianceReport(filter.startDate, filter.endDate);
          break;
        default:
          throw new AppError(`Tipo de relatório inválido: ${filter.reportType}`, 400);
      }

      // Calcular checksum para garantir integridade
      const checksum = this.calculateChecksum(reportData);

      const result: AnvisaReportResult = {
        id: crypto.randomUUID(),
        reportType: filter.reportType,
        generatedAt: new Date(),
        period: {
          start: filter.startDate,
          end: filter.endDate
        },
        checksum,
        data: reportData,
        exportFormats: ['json', 'csv', 'pdf', 'xml']
      };

      logger.info('✅ Relatório ANVISA gerado com sucesso', {
        tenantId: this.tenantId,
        reportId: result.id,
        checksum
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Erro ao gerar relatório ANVISA', {
        tenantId: this.tenantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Gera relatório específico de Guia 33
   */
  private async generateGuia33Report(startDate: Date, endDate: Date): Promise<Guia33Record[]> {
    // Buscar substâncias controladas
    const controlledSubstances = await this.prisma.controlledSubstance.findMany({
      where: {
        status: 'active'
      },
      include: {
        product: true,
        movements: {
          where: {
            movementDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            batch: true,
            customer: true,
            supplier: true
          },
          orderBy: {
            movementDate: 'asc'
          }
        }
      }
    });

    const records: Guia33Record[] = [];

    for (const substance of controlledSubstances) {
      // Calcular saldo de abertura
      const openingBalance = await this.calculateOpeningBalance(substance.id, startDate);

      // Calcular entradas e saídas
      const entries = substance.movements
        .filter(m => m.movementType.includes('ENTRY') || m.movementType === 'IN')
        .reduce((sum, m) => sum + m.quantity, 0);

      const exits = substance.movements
        .filter(m => m.movementType.includes('EXIT') || m.movementType === 'OUT')
        .reduce((sum, m) => sum + m.quantity, 0);

      const closingBalance = openingBalance + entries - exits;

      records.push({
        substanceName: substance.product.name,
        registrationNumber: substance.registrationNumber,
        batchNumber: substance.movements[0]?.batch?.batchNumber || 'N/A',
        openingBalance,
        entries,
        exits,
        closingBalance,
        movements: substance.movements.map(m => ({
          date: m.movementDate,
          type: m.movementType.includes('ENTRY') ? 'ENTRY' : 'EXIT',
          quantity: m.quantity,
          document: m.documentNumber || 'S/N',
          party: m.customer?.companyName || m.supplier?.companyName || 'Não informado'
        }))
      });
    }

    return records;
  }

  /**
   * Gera relatório SNGPC (Sistema Nacional de Gerenciamento de Produtos Controlados)
   */
  private async generateSngpcReport(startDate: Date, endDate: Date): Promise<SngpcComplianceReport> {
    // Buscar submissões SNGPC no período
    const submissions = await this.prisma.sngpcSubmission.findMany({
      where: {
        tenantId: this.tenantId,
        submissionDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalSubmissions = submissions.length;
    const successfulSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'success').length;
    const failedSubmissions = submissions.filter(s => s.status === 'failed' || s.status === 'error').length;
    const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;

    // Buscar substâncias controladas
    const controlledSubstances = await this.prisma.controlledSubstance.count({
      where: { status: 'active' }
    });

    // Contar movimentos totais
    const totalMovements = submissions.reduce((sum, s) => sum + s.movementsCount, 0);

    // Calcular taxa de conformidade
    const complianceRate = totalSubmissions > 0
      ? (successfulSubmissions / totalSubmissions) * 100
      : 100;

    // Identificar problemas
    const issues = [];

    if (failedSubmissions > 0) {
      issues.push({
        type: 'SUBMISSION_FAILURE',
        description: `${failedSubmissions} submissões falharam`,
        severity: failedSubmissions > totalSubmissions * 0.1 ? 'HIGH' : 'MEDIUM',
        resolution: 'Verificar logs e reenviar submissões'
      } as any);
    }

    if (pendingSubmissions > 5) {
      issues.push({
        type: 'PENDING_BACKLOG',
        description: `${pendingSubmissions} submissões pendentes`,
        severity: 'MEDIUM',
        resolution: 'Processar submissões pendentes'
      } as any);
    }

    if (complianceRate < 95) {
      issues.push({
        type: 'LOW_COMPLIANCE_RATE',
        description: `Taxa de conformidade abaixo de 95% (${complianceRate.toFixed(2)}%)`,
        severity: 'CRITICAL',
        resolution: 'Revisar processos de submissão SNGPC'
      } as any);
    }

    return {
      period: {
        start: startDate,
        end: endDate
      },
      totalSubmissions,
      successfulSubmissions,
      failedSubmissions,
      pendingSubmissions,
      controlledSubstances,
      totalMovements,
      complianceRate,
      issues
    };
  }

  /**
   * Gera relatório SNCM (Sistema Nacional de Controle de Medicamentos)
   */
  private async generateSncmReport(startDate: Date, endDate: Date): Promise<any> {
    // SNCM é similar ao SNGPC mas com foco em rastreabilidade de lotes
    const trackings = await this.prisma.medicationTracking.findMany({
      where: {
        trackedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        product: true,
        batch: true
      }
    });

    return {
      period: {
        start: startDate,
        end: endDate
      },
      totalTrackings: trackings.length,
      trackingsByAction: this.groupBy(trackings, 'action'),
      trackingsByProduct: this.groupBy(trackings.map(t => ({ ...t, productName: t.product.name })), 'productName'),
      batchesTracked: new Set(trackings.map(t => t.batchId)).size
    };
  }

  /**
   * Gera relatório completo de conformidade (todos os tipos)
   */
  private async generateFullComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const [guia33, sngpc, sncm] = await Promise.all([
      this.generateGuia33Report(startDate, endDate),
      this.generateSngpcReport(startDate, endDate),
      this.generateSncmReport(startDate, endDate)
    ]);

    return {
      guia33,
      sngpc,
      sncm,
      summary: {
        totalControlledSubstances: guia33.length,
        totalSngpcSubmissions: sngpc.totalSubmissions,
        totalSncmTrackings: sncm.totalTrackings,
        complianceRate: sngpc.complianceRate,
        criticalIssues: sngpc.issues.filter(i => i.severity === 'CRITICAL').length
      }
    };
  }

  /**
   * Exporta relatório em formato específico
   */
  async exportReport(reportId: string, format: 'json' | 'csv' | 'pdf' | 'xml'): Promise<Buffer | string> {
    // TODO: Implementar export real para cada formato
    logger.info('📤 Exportando relatório ANVISA', {
      tenantId: this.tenantId,
      reportId,
      format
    });

    switch (format) {
      case 'json':
        return JSON.stringify({ message: 'Export JSON implementado' }, null, 2);
      case 'csv':
        return 'CSV Export - Em desenvolvimento';
      case 'pdf':
        throw new AppError('Export PDF em desenvolvimento', 501);
      case 'xml':
        return '<xml>Em desenvolvimento</xml>';
      default:
        throw new AppError(`Formato não suportado: ${format}`, 400);
    }
  }

  // ========================== MÉTODOS PRIVADOS ==========================

  /**
   * Calcula saldo de abertura de uma substância controlada
   */
  private async calculateOpeningBalance(substanceId: string, startDate: Date): Promise<number> {
    const movementsBefore = await this.prisma.controlledSubstanceMovement.findMany({
      where: {
        substanceId,
        movementDate: {
          lt: startDate
        }
      }
    });

    const entries = movementsBefore
      .filter(m => m.movementType.includes('ENTRY') || m.movementType === 'IN')
      .reduce((sum, m) => sum + m.quantity, 0);

    const exits = movementsBefore
      .filter(m => m.movementType.includes('EXIT') || m.movementType === 'OUT')
      .reduce((sum, m) => sum + m.quantity, 0);

    return entries - exits;
  }

  /**
   * Calcula checksum SHA-256 dos dados do relatório
   */
  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Agrupa array por propriedade
   */
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const groupKey = item[key] || 'Unknown';
      result[groupKey] = (result[groupKey] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }
}
