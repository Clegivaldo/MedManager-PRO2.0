import { PaymentGateway, CreateChargeParams, ChargeResponse, PaymentStatus } from './PaymentGateway.interface.js';
import { AppError } from '../../utils/errors.js';

interface AsaasConfig {
    apiKey: string;
    environment: 'sandbox' | 'production';
}

interface AsaasCustomerResponse {
    id: string;
    name: string;
    email?: string;
    cpfCnpj?: string;
}

interface AsaasChargeResponse {
    id: string;
    customer: string;
    value: number;
    dueDate: string;
    invoiceNumber?: string;
    status: string;
    paymentLink?: string;
    bankSlipUrl?: string;
    pixQrCode?: {
        encodedImage: string;
        payload: string;
        expirationDate: string;
    };
    billingType: string;
    deleted?: boolean;
}

export class AsaasGateway implements PaymentGateway {
    constructor(private config: AsaasConfig) { }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const { apiKey, environment } = this.config;

        if (!apiKey) {
            throw new AppError('Gateway Asaas não configurado (API Key ausente)', 500, 'ASAAS_NOT_CONFIGURED');
        }

        const baseUrl = environment === 'production' ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';
        const url = `${baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'access_token': apiKey,
                ...(options.headers || {}),
            },
        });

        if (!response.ok) {
            const body = await response.text();
            // Tentar parsear erro JSON
            let errorMessage = body;
            try {
                const jsonError = JSON.parse(body);
                if (jsonError.errors && Array.isArray(jsonError.errors)) {
                    errorMessage = jsonError.errors.map((e: any) => e.description).join(', ');
                }
            } catch { }

            throw new AppError(`Erro Asaas (${response.status}): ${errorMessage}`, response.status);
        }

        return response.json() as Promise<T>;
    }

    private mapStatus(asaasStatus: string): PaymentStatus {
        switch (asaasStatus) {
            case 'PENDING': return 'pending';
            case 'RECEIVED':
            case 'CONFIRMED': return 'confirmed';
            case 'OVERDUE': return 'overdue';
            case 'REFUNDED': return 'refunded';
            case 'CANCELLED':
            case 'DELETED': return 'cancelled';
            default: return 'pending';
        }
    }

    async ensureCustomer(params: CreateChargeParams['customer']): Promise<string> {
        // Buscar cliente pelo CPF/CNPJ primeiro para evitar duplicidade
        const query = new URLSearchParams({ cpfCnpj: params.taxId });
        const search = await this.request<{ data: AsaasCustomerResponse[] }>(`/customers?${query.toString()}`);

        if (search.data && search.data.length > 0) {
            return search.data[0].id;
        }

        // Criar novo
        const payload = {
            name: params.name,
            cpfCnpj: params.taxId,
            email: params.email,
            phone: params.phone,
            address: params.address?.street,
            addressNumber: params.address?.number,
            complement: params.address?.complement,
            province: params.address?.district,
            postalCode: params.address?.zipCode,
        };

        const created = await this.request<AsaasCustomerResponse>('/customers', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        return created.id;
    }

    async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
        const customerId = await this.ensureCustomer(params.customer);

        const payload = {
            customer: customerId,
            value: params.amount,
            dueDate: params.dueDate,
            description: params.description,
            billingType: params.paymentMethod,
            externalReference: `${params.tenantId}-${Date.now()}`,
        };

        const charge = await this.request<AsaasChargeResponse>('/payments', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        return {
            id: charge.id,
            status: this.mapStatus(charge.status),
            value: charge.value,
            dueDate: charge.dueDate,
            paymentLink: charge.paymentLink,
            boletoUrl: charge.bankSlipUrl,
            pixQrCode: charge.pixQrCode?.payload,
            pixQrCodeBase64: charge.pixQrCode?.encodedImage,
            originalResponse: charge
        };
    }

    async getChargeStatus(chargeId: string): Promise<ChargeResponse> {
        const charge = await this.request<AsaasChargeResponse>(`/payments/${chargeId}`);

        return {
            id: charge.id,
            status: this.mapStatus(charge.status),
            value: charge.value,
            dueDate: charge.dueDate,
            paymentLink: charge.paymentLink,
            boletoUrl: charge.bankSlipUrl,
            pixQrCode: charge.pixQrCode?.payload,
            pixQrCodeBase64: charge.pixQrCode?.encodedImage,
            originalResponse: charge
        };
    }

    async cancelCharge(chargeId: string): Promise<void> {
        await this.request(`/payments/${chargeId}`, { method: 'DELETE' });
    }

    async listAllCharges(params?: { offset?: number; limit?: number; customer?: string }) {
        const query = new URLSearchParams();
        if (params?.offset) query.append('offset', String(params.offset));
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.customer) query.append('customer', params.customer);

        const response = await this.request<{ data: AsaasChargeResponse[]; hasMore: boolean; totalCount: number }>(`/payments?${query.toString()}`);
        return response;
    }
}
