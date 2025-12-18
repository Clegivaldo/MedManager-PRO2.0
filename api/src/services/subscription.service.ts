import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { addMonths, addYears, isBefore } from 'date-fns';

export interface CreateSubscriptionDto {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  autoRenew?: boolean;
  startDate?: Date;
}

export interface RenewSubscriptionDto {
  months?: number;
  billingCycle?: 'monthly' | 'annual';
}

export class SubscriptionService {
  constructor(private prisma: PrismaClientType) {}

  /**
   * Cria uma nova assinatura para um tenant
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<any> {
    const { tenantId, planId, billingCycle, autoRenew = true, startDate = new Date() } = data;

    // Buscar plano
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    if (!plan.isActive) {
      throw new Error('Plano não está ativo');
    }

    // Calcular data de fim
    const endDate = billingCycle === 'annual' 
      ? addYears(startDate, 1) 
      : addMonths(startDate, 1);

    // Verificar se já existe assinatura
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (existingSubscription) {
      throw new Error('Tenant já possui uma assinatura. Use renewSubscription para renovar.');
    }

    // Criar assinatura
    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        startDate,
        endDate,
        status: 'active',
        billingCycle,
        autoRenew,
      },
      include: {
        plan: true,
      },
    });

    // Atualizar tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        subscriptionStatus: 'active',
        plan: plan.name,
        modulesEnabled: plan.features as any,
      },
    });

    return subscription;
  }

  /**
   * Renova uma assinatura existente
   */
  async renewSubscription(
    tenantId: string,
    data: RenewSubscriptionDto = {}
  ): Promise<any> {
    const { months = 1, billingCycle } = data;

    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    // Calcular nova data de fim
    // Se já estiver vencida, começar de hoje
    // Se ainda estiver ativa, adicionar a partir da data de fim atual
    const now = new Date();
    const baseDate = isBefore(subscription.endDate, now) 
      ? now 
      : subscription.endDate;

    const newEndDate = addMonths(baseDate, months);

    // Atualizar assinatura
    const updatedSubscription = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        endDate: newEndDate,
        status: 'active',
        ...(billingCycle && { billingCycle }),
      },
      include: {
        plan: true,
      },
    });

    // Atualizar tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionEnd: newEndDate,
        subscriptionStatus: 'active',
        status: 'active',
      },
    });

    return updatedSubscription;
  }

  /**
   * Verifica se a assinatura está válida
   */
  async checkValidity(tenantId: string): Promise<{
    isValid: boolean;
    subscription: any | null;
    reason?: string;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        isValid: false,
        subscription: null,
        reason: 'Assinatura não encontrada',
      };
    }

    const now = new Date();

    // Verificar se expirou
    if (isBefore(subscription.endDate, now)) {
      // Atualizar status se necessário
      if (subscription.status !== 'expired') {
        await this.updateSubscriptionStatus(tenantId, 'expired');
      }
      return {
        isValid: false,
        subscription,
        reason: 'Assinatura expirada',
      };
    }

    // Verificar status
    if (subscription.status === 'suspended') {
      return {
        isValid: false,
        subscription,
        reason: 'Assinatura suspensa',
      };
    }

    if (subscription.status === 'cancelled') {
      return {
        isValid: false,
        subscription,
        reason: 'Assinatura cancelada',
      };
    }

    return {
      isValid: true,
      subscription,
    };
  }

  /**
   * Suspende uma assinatura
   */
  async suspendSubscription(tenantId: string, reason?: string): Promise<any> {
    const subscription = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'suspended',
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'suspended',
        status: 'suspended',
      },
    });

    return subscription;
  }

  /**
   * Reativa uma assinatura suspensa
   */
  async reactivateSubscription(tenantId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    if (subscription.status !== 'suspended') {
      throw new Error('Apenas assinaturas suspensas podem ser reativadas');
    }

    const now = new Date();
    const isExpired = isBefore(subscription.endDate, now);

    const updatedSubscription = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: isExpired ? 'expired' : 'active',
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: isExpired ? 'expired' : 'active',
        status: isExpired ? 'suspended' : 'active',
      },
    });

    return updatedSubscription;
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(
    tenantId: string,
    reason?: string
  ): Promise<any> {
    const subscription = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
        autoRenew: false,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'cancelled',
        status: 'inactive',
      },
    });

    return subscription;
  }

  /**
   * Altera o plano de uma assinatura
   */
  async changePlan(
    tenantId: string,
    newPlanId: string,
    immediate: boolean = true
  ): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new Error('Novo plano não encontrado');
    }

    if (!newPlan.isActive) {
      throw new Error('Novo plano não está ativo');
    }

    // Atualizar assinatura
    const updatedSubscription = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        planId: newPlanId,
      },
      include: {
        plan: true,
      },
    });

    // Atualizar tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: newPlan.name,
        modulesEnabled: newPlan.features as any,
      },
    });

    return updatedSubscription;
  }

  /**
   * Lista assinaturas próximas do vencimento
   */
  async getExpiringSubscriptions(daysAhead: number = 7): Promise<any[]> {
    const now = new Date();
    const futureDate = addMonths(now, 0);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        tenant: true,
        plan: true,
      },
      orderBy: {
        endDate: 'asc',
      },
    });
  }

  /**
   * Atualiza status de uma assinatura
   */
  private async updateSubscriptionStatus(
    tenantId: string,
    status: string
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { tenantId },
      data: { status },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        subscriptionStatus: status,
        ...(status === 'expired' && { status: 'suspended' }),
      },
    });
  }

  /**
   * Obtém informações da assinatura de um tenant
   */
  async getSubscriptionInfo(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
        tenant: true,
      },
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const daysUntilExpiration = Math.ceil(
      (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ...subscription,
      daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
      isExpired: daysUntilExpiration < 0,
    };
  }
}
