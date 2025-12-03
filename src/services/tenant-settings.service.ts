// src/services/tenant-settings.service.ts
import api from './api';

export interface TenantSettings {
    id: string;
    cnpj: string;
    companyName: string;
    tradingName?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    taxRegime: string;
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    phone: string;
    mobile?: string;
    email: string;
    nfeEmail?: string;
    logoUrl?: string;
    hasCertificate: boolean;
    hasCscToken: boolean;
    cscId?: string;
    sefazEnvironment: string;
    nfeNextNumber: number;
    nfeSeries: number;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateTenantSettingsDTO {
    cnpj?: string;
    companyName?: string;
    tradingName?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    taxRegime?: string;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    nfeEmail?: string;
    cscId?: string;
    cscToken?: string;
    sefazEnvironment?: string;
}

class TenantSettingsService {
    /**
     * Buscar configurações do tenant
     */
    async getSettings(): Promise<TenantSettings> {
        const response = await api.get('/tenant/settings');
        return response.data.data;
    }

    /**
     * Atualizar configurações do tenant
     */
    async updateSettings(data: UpdateTenantSettingsDTO): Promise<TenantSettings> {
        const response = await api.put('/tenant/settings', data);
        return response.data.data;
    }

    /**
     * Upload de logo
     */
    async uploadLogo(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('logo', file);

        const response = await api.post('/tenant/settings/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.data.logoUrl;
    }

    /**
     * Upload de certificado digital
     */
    async uploadCertificate(file: File, password: string): Promise<void> {
        const formData = new FormData();
        formData.append('certificate', file);
        formData.append('password', password);

        await api.post('/tenant/settings/certificate', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}

export default new TenantSettingsService();
