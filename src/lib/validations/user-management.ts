// src/lib/validations/user-management.ts
import { z } from 'zod';

export const inviteUserSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    role: z.enum(['ADMIN', 'PHARMACIST', 'OPERATIONS_MANAGER', 'OPERATOR', 'SALESPERSON', 'AUDITOR'], {
        errorMap: () => ({ message: 'Selecione um cargo válido' }),
    }),
});

export const updateUserSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').optional(),
    role: z.enum(['ADMIN', 'PHARMACIST', 'OPERATIONS_MANAGER', 'OPERATOR', 'SALESPERSON', 'AUDITOR']).optional(),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
