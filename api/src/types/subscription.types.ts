export interface SubscriptionDto {
  id: string;
  tenantId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | 'annual';
  autoRenew: boolean;
  trialEndDate?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export type SubscriptionStatus = 
  | 'trial' 
  | 'active' 
  | 'expired' 
  | 'suspended' 
  | 'cancelled';

export interface PlanDto {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  priceMonthly: number;
  priceAnnual?: number;
  maxUsers: number;
  maxProducts: number;
  maxMonthlyTransactions: number;
  maxStorageGb: number;
  maxApiCallsPerMinute: number;
  features: string[]; // Array de módulos
  isActive: boolean;
  isHighlighted: boolean;
}

export interface UsageMetricsDto {
  id: string;
  tenantId: string;
  period: Date;
  userCount: number;
  productCount: number;
  transactionCount: number;
  storageUsedMb: number;
  apiCalls: number;
  nfeIssued: number;
  peakApiCallsPerMinute: number;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  autoRenew?: boolean;
  startDate?: string; // ISO string
}

export interface RenewSubscriptionRequest {
  months?: number;
  billingCycle?: 'monthly' | 'annual';
}

export interface ChangePlanRequest {
  newPlanId: string;
  immediate?: boolean;
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

export interface SubscriptionInfoResponse {
  subscription: SubscriptionDto;
  plan: PlanDto;
  daysUntilExpiration: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface UsageDashboardResponse {
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxMonthlyTransactions: number;
    maxStorageGb: number;
    maxApiCallsPerMinute: number;
  };
  usage: {
    userCount: number;
    productCount: number;
    transactionCount: number;
    storageUsedGb: number;
    apiCalls: number;
    peakApiCallsPerMinute: number;
  };
  metrics: UsageMetric[];
}

export interface UsageMetric {
  name: string;
  current: number;
  limit: number | 'Ilimitado';
  percentage: number;
  status: 'ok' | 'warning' | 'critical';
  unit: string;
}
