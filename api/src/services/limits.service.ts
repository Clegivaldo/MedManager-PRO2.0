import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { startOfMonth, endOfMonth } from 'date-fns';

export interface UsageLimits {
  maxUsers: number;
  maxProducts: number;
  maxMonthlyTransactions: number;
  maxStorageGb: number;
  maxApiCallsPerMinute: number;
}

export interface CurrentUsage {
  userCount: number;
  productCount: number;
  transactionCount: number;
  storageUsedMb: number;
  apiCalls: number;
  peakApiCallsPerMinute: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  limitType?: string;
  current?: number;
  limit?: number;
  message?: string;
}

export class LimitsService {
  constructor(private prisma: PrismaClientType) {}

  /**
   * Obtém os limites do plano de um tenant
   */
  async getTenantLimits(tenantId: string): Promise<UsageLimits> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Tenant não possui assinatura ativa');
    }

    return {
      maxUsers: subscription.plan.maxUsers,
      maxProducts: subscription.plan.maxProducts,
      maxMonthlyTransactions: subscription.plan.maxMonthlyTransactions,
      maxStorageGb: subscription.plan.maxStorageGb,
      maxApiCallsPerMinute: subscription.plan.maxApiCallsPerMinute,
    };
  }

  /**
   * Obtém o uso atual do tenant no mês corrente
   */
  async getCurrentUsage(tenantId: string): Promise<CurrentUsage> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    // Buscar métricas do mês atual
    let metrics = await this.prisma.usageMetrics.findUnique({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
    });

    // Se não existir, criar
    if (!metrics) {
      metrics = await this.prisma.usageMetrics.create({
        data: {
          tenantId,
          period: periodStart,
          userCount: 0,
          productCount: 0,
          transactionCount: 0,
          storageUsedMb: 0,
          apiCalls: 0,
          peakApiCallsPerMinute: 0,
          nfeIssued: 0,
        },
      });
    }

    return {
      userCount: metrics.userCount,
      productCount: metrics.productCount,
      transactionCount: metrics.transactionCount,
      storageUsedMb: metrics.storageUsedMb,
      apiCalls: metrics.apiCalls,
      peakApiCallsPerMinute: metrics.peakApiCallsPerMinute,
    };
  }

  /**
   * Verifica se pode criar um novo usuário
   */
  async checkUserLimit(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    // Limite ilimitado
    if (limits.maxUsers >= 999999) {
      return { allowed: true };
    }

    if (usage.userCount >= limits.maxUsers) {
      return {
        allowed: false,
        limitType: 'users',
        current: usage.userCount,
        limit: limits.maxUsers,
        message: `Limite de usuários atingido (${limits.maxUsers}). Faça upgrade do seu plano.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica se pode criar um novo produto
   */
  async checkProductLimit(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    if (limits.maxProducts >= 999999) {
      return { allowed: true };
    }

    if (usage.productCount >= limits.maxProducts) {
      return {
        allowed: false,
        limitType: 'products',
        current: usage.productCount,
        limit: limits.maxProducts,
        message: `Limite de produtos atingido (${limits.maxProducts}). Faça upgrade do seu plano.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica se pode criar uma nova transação (invoice)
   */
  async checkTransactionLimit(tenantId: string): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    if (limits.maxMonthlyTransactions >= 999999) {
      return { allowed: true };
    }

    if (usage.transactionCount >= limits.maxMonthlyTransactions) {
      return {
        allowed: false,
        limitType: 'transactions',
        current: usage.transactionCount,
        limit: limits.maxMonthlyTransactions,
        message: `Limite mensal de transações atingido (${limits.maxMonthlyTransactions}). Aguarde o próximo mês ou faça upgrade.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verifica se tem espaço de armazenamento disponível
   */
  async checkStorageLimit(tenantId: string, additionalMb: number = 0): Promise<LimitCheckResult> {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    const maxStorageMb = limits.maxStorageGb * 1024;
    const projectedUsage = usage.storageUsedMb + additionalMb;

    if (projectedUsage >= maxStorageMb) {
      return {
        allowed: false,
        limitType: 'storage',
        current: Math.round(usage.storageUsedMb / 1024 * 10) / 10,
        limit: limits.maxStorageGb,
        message: `Limite de armazenamento atingido (${limits.maxStorageGb}GB). Faça upgrade do seu plano.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Atualiza a contagem de usuários
   */
  async trackUserCount(tenantId: string, count: number): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        userCount: count,
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: count,
        productCount: 0,
        transactionCount: 0,
        storageUsedMb: 0,
        apiCalls: 0,
        peakApiCallsPerMinute: 0,
        nfeIssued: 0,
      },
    });
  }

  /**
   * Atualiza a contagem de produtos
   */
  async trackProductCount(tenantId: string, count: number): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        productCount: count,
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: 0,
        productCount: count,
        transactionCount: 0,
        storageUsedMb: 0,
        apiCalls: 0,
        peakApiCallsPerMinute: 0,
        nfeIssued: 0,
      },
    });
  }

  /**
   * Incrementa a contagem de transações
   */
  async trackTransaction(tenantId: string): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        transactionCount: {
          increment: 1,
        },
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: 0,
        productCount: 0,
        transactionCount: 1,
        storageUsedMb: 0,
        apiCalls: 0,
        peakApiCallsPerMinute: 0,
        nfeIssued: 0,
      },
    });
  }

  /**
   * Atualiza uso de armazenamento
   */
  async trackStorage(tenantId: string, storageMb: number): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        storageUsedMb: storageMb,
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: 0,
        productCount: 0,
        transactionCount: 0,
        storageUsedMb: storageMb,
        apiCalls: 0,
        peakApiCallsPerMinute: 0,
        nfeIssued: 0,
      },
    });
  }

  /**
   * Incrementa contagem de chamadas de API
   */
  async trackApiCall(tenantId: string): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        apiCalls: {
          increment: 1,
        },
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: 0,
        productCount: 0,
        transactionCount: 0,
        storageUsedMb: 0,
        apiCalls: 1,
        peakApiCallsPerMinute: 0,
        nfeIssued: 0,
      },
    });
  }

  /**
   * Incrementa contagem de NF-e emitidas
   */
  async trackNfeIssued(tenantId: string): Promise<void> {
    const now = new Date();
    const periodStart = startOfMonth(now);

    await this.prisma.usageMetrics.upsert({
      where: {
        tenantId_period: {
          tenantId,
          period: periodStart,
        },
      },
      update: {
        nfeIssued: {
          increment: 1,
        },
      },
      create: {
        tenantId,
        period: periodStart,
        userCount: 0,
        productCount: 0,
        transactionCount: 0,
        storageUsedMb: 0,
        apiCalls: 0,
        peakApiCallsPerMinute: 0,
        nfeIssued: 1,
      },
    });
  }

  /**
   * Obtém dashboard de uso vs limites
   */
  async getUsageDashboard(tenantId: string) {
    const limits = await this.getTenantLimits(tenantId);
    const usage = await this.getCurrentUsage(tenantId);

    const calculatePercentage = (current: number, max: number) => {
      if (max >= 999999) return 0; // Ilimitado
      return Math.round((current / max) * 100);
    };

    const getStatus = (percentage: number): 'ok' | 'warning' | 'critical' => {
      if (percentage >= 90) return 'critical';
      if (percentage >= 80) return 'warning';
      return 'ok';
    };

    const userPercentage = calculatePercentage(usage.userCount, limits.maxUsers);
    const productPercentage = calculatePercentage(usage.productCount, limits.maxProducts);
    const transactionPercentage = calculatePercentage(usage.transactionCount, limits.maxMonthlyTransactions);
    const storagePercentage = calculatePercentage(usage.storageUsedMb / 1024, limits.maxStorageGb);

    return {
      limits,
      usage: {
        ...usage,
        storageUsedGb: Math.round(usage.storageUsedMb / 1024 * 10) / 10,
      },
      metrics: [
        {
          name: 'Usuários',
          current: usage.userCount,
          limit: limits.maxUsers >= 999999 ? 'Ilimitado' : limits.maxUsers,
          percentage: userPercentage,
          status: getStatus(userPercentage),
          unit: 'usuários',
        },
        {
          name: 'Produtos',
          current: usage.productCount,
          limit: limits.maxProducts >= 999999 ? 'Ilimitado' : limits.maxProducts,
          percentage: productPercentage,
          status: getStatus(productPercentage),
          unit: 'produtos',
        },
        {
          name: 'Transações Mensais',
          current: usage.transactionCount,
          limit: limits.maxMonthlyTransactions >= 999999 ? 'Ilimitado' : limits.maxMonthlyTransactions,
          percentage: transactionPercentage,
          status: getStatus(transactionPercentage),
          unit: 'transações',
        },
        {
          name: 'Armazenamento',
          current: Math.round(usage.storageUsedMb / 1024 * 10) / 10,
          limit: limits.maxStorageGb,
          percentage: storagePercentage,
          status: getStatus(storagePercentage),
          unit: 'GB',
        },
      ],
    };
  }
}
