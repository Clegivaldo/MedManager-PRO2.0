// src/lib/validations/tenant-settings.ts
import { z } from 'zod';

export const tenantSettingsSchema = z.object({
    // Dados cadastrais
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
    companyName: z.string().min(3, 'Mínimo 3 caracteres'),
    tradingName: z.string().optional(),
    stateRegistration: z.string().optional(),
    municipalRegistration: z.string().optional(),
    taxRegime: z.enum(['simple_national', 'real_profit', 'presumed_profit', 'mei']),

    // Endereço
    zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido'),
    street: z.string().min(3, 'Rua é obrigatória'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, 'Bairro é obrigatório'),
    city: z.string().min(3, 'Cidade é obrigatória'),
    state: z.string().length(2, 'Estado deve ter 2 caracteres'),

    // Contatos
    phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido'),
    mobile: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Celular inválido').optional(),
    email: z.string().email('Email inválido'),
    nfeEmail: z.string().email('Email inválido').optional(),

    // SEFAZ
    cscId: z.string().optional(),
    cscToken: z.string().optional(),
    sefazEnvironment: z.enum(['homologacao', 'producao']),
});

export type TenantSettingsFormData = z.infer<typeof tenantSettingsSchema>;
