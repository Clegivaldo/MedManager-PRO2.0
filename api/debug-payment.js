import { PaymentService } from './src/services/payment/payment.service.js';

// Mocking manual for a simple script
const mockPrisma = {
    globalPaymentConfig: {
        findFirst: async () => ({ activeGateway: 'asaas', asaasApiKey: 'test-key' })
    },
    tenant: {
        findUnique: async () => ({ id: 't1', name: 'Tenant 1', cnpj: '1' })
    },
    payment: {
        create: async (data) => ({ id: 'p1', ...data.data })
    }
};

const service = new PaymentService(mockPrisma);

console.log('Testing createCharge...');
service.createCharge({
    tenantId: 't1',
    amount: 100,
    description: 'Test',
    paymentMethod: 'PIX'
})
    .then(res => console.log('Result:', res))
    .catch(err => console.error('Error:', err));
