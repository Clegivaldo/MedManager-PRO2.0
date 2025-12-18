import api, { ApiResponse } from './api';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'DENIED'
  | 'IN_CONTINGENCY';

export interface InvoiceItemDTO {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  batchId?: string;
  expirationDate?: string;
  controlledSubstance?: boolean;
}

export interface CreateInvoiceDTO {
  customerId: string;
  items: InvoiceItemDTO[];
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'billet' | 'pix';
  installments?: number;
  observations?: string;
  operationType?: 'sale' | 'return' | 'transfer' | 'bonus' | 'sample';
  cfop?: string;
  naturezaOperacao?: string;
}

export interface InvoiceListItem {
  id: string;
  number: number;
  series: number;
  status: InvoiceStatus;
  accessKey?: string | null;
  protocol?: string | null;
  issueDate: string;
  totalValue: string; // decimal as string
  customer?: {
    id: string;
    companyName: string;
    cnpjCpf: string;
    email?: string | null;
  } | null;
}

export interface InvoiceListResponse {
  invoices: InvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class InvoiceService {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    operationType?: 'ENTRY' | 'EXIT' | 'DEVOLUTION' | 'sale' | 'return' | 'transfer' | 'bonus' | 'sample';
    search?: string;
  }) {
    const response = await api.get<ApiResponse<InvoiceListResponse>>('/invoices', { params });
    return response.data.data;
  }

  async getById(id: string) {
    const response = await api.get<ApiResponse<InvoiceListItem>>(`/invoices/${id}`);
    return response.data.data;
  }

  async create(payload: CreateInvoiceDTO) {
    const response = await api.post<ApiResponse<InvoiceListItem>>('/invoices', payload);
    return response.data.data;
  }

  async emit(id: string) {
    const response = await api.post<ApiResponse<InvoiceListItem>>(`/invoices/${id}/emit`);
    return response.data.data;
  }

  async cancel(id: string, justification: string, protocolNumber?: string) {
    const response = await api.post<ApiResponse<InvoiceListItem>>(`/invoices/${id}/cancel`, {
      justification,
      protocolNumber,
    });
    return response.data.data;
  }

  async status(id: string) {
    const response = await api.get<ApiResponse<any>>(`/invoices/${id}/nfe-status`);
    return response.data.data;
  }

  async downloadDanfe(id: string) {
    const response = await api.get(`/fiscal/nfe/${id}/danfe`, { responseType: 'blob' });
    return response.data as Blob;
  }

  async downloadXml(id: string) {
    const response = await api.get(`/invoices/${id}/xml`, { responseType: 'blob' });
    return response.data as Blob;
  }

  async correction(id: string, correctionText: string) {
    const response = await api.post(`/fiscal/nfe/cce/${id}`, { correctionText });
    return response.data;
  }
}

export default new InvoiceService();
