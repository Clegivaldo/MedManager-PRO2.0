// src/lib/validations/financial.ts
import { z } from 'zod';

export const createTransactionSchema = z.object({
    type: z.enum(['RECEIVABLE', 'PAYABLE'], {
        errorMap: () => ({ message: 'Selecione o tipo de transação' }),
    }),
    description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    value: z.number().positive('Valor deve ser positivo'),
    dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
    category: z.string().optional(),
    client: z.string().optional(),
    supplier: z.string().optional(),
});

export type CreateTransactionFormData = z.infer<typeof createTransactionSchema>;
