export interface CreateChargeParams {
  tenantId: string;
  amount: number;
  description: string;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  dueDate?: string; // YYYY-MM-DD
  customer: {
    name: string;
    email: string;
    taxId: string; // CPF/CNPJ
    phone?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      district: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

export type PaymentStatus = 'pending' | 'confirmed' | 'overdue' | 'cancelled' | 'refunded' | 'failed';

export interface ChargeResponse {
  id: string; // Gateway ID
  status: PaymentStatus;
  value: number;
  dueDate: string;
  paymentLink?: string;
  boletoUrl?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  originalResponse?: any; // Para debug/auditoria
}

export interface PaymentGateway {
  createCharge(params: CreateChargeParams): Promise<ChargeResponse>;
  getChargeStatus(chargeId: string): Promise<ChargeResponse>;
  cancelCharge(chargeId: string): Promise<void>;
}
