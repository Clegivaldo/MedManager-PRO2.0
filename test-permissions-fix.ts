/**
 * Script: Teste de persistência de permissões
 * Uso: npx tsx test-permissions-fix.ts
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3333/api/v1';

// NUNCA commitar credenciais hardcoded!
// Usando as mesmas variáveis do .env.test ou .env (se disponíveis)
// Fallback para valores padrão conhecidos de desenvolvimento
const ADMIN_EMAIL = process.env.TEST_USER_EMAIL || 'admin@farmaciademo.com.br';
const ADMIN_PASSWORD = process.env.TEST_USER_PASSWORD || 'admin123';

async function testPermissionsFix() {
    console.log('🧪 Iniciando teste de persistência de permissões...');

    try {
        // 1. Login
        console.log(`🔐 Logando como admin (${ADMIN_EMAIL})...`);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.data?.accessToken;
        if (!token) throw new Error('Falha ao obter token');
        console.log('✅ Login realizado.');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Criar usuário temporário
        const randomSuffix = Math.floor(Math.random() * 10000);
        const tempUser = {
            name: `Test User ${randomSuffix}`,
            email: `testperm${randomSuffix}@demo.com`,
            password: 'password123',
            role: 'OPERATOR'
        };

        console.log(`👤 Criando usuário temporário: ${tempUser.email}...`);
        const createRes = await axios.post(`${API_URL}/users`, tempUser, { headers });
        const userId = createRes.data.data?.user?.id || createRes.data.user?.id; // Ajuste conforme resposta real

        if (!userId) {
            console.log('Resposta Create:', JSON.stringify(createRes.data, null, 2));
            throw new Error('ID do usuário não retornado na criação (verifique se payload está correto)');
        }
        console.log(`✅ Usuário criado. ID: ${userId}`);

        // 3. Definir permissões
        const testPermissions = ['PRODUCT_READ', 'PRODUCT_CREATE', 'TEST_PERM_XYZ'];
        console.log(`📝 Definindo permissões: ${JSON.stringify(testPermissions)}...`);

        await axios.put(`${API_URL}/users/${userId}/permissions`, {
            permissions: testPermissions
        }, { headers });
        console.log('✅ Permissões enviadas (PUT).');

        // 4. Ler permissões (Imediato)
        console.log('🔍 verificando persistência (GET)...');
        const getRes = await axios.get(`${API_URL}/users/${userId}`, { headers });
        const user = getRes.data.data;

        console.log('📄 Permissões recebidas:', JSON.stringify(user.permissions));

        // Verificações
        if (!Array.isArray(user.permissions)) {
            throw new Error(`❌ FALHA: Permissões não são array! Tipo: ${typeof user.permissions}`);
        }

        if (user.permissions.length !== 3) {
            throw new Error(`❌ FALHA: Tamanho do array incorreto. Esperado: 3, Recebido: ${user.permissions.length}`);
        }

        if (!user.permissions.includes('TEST_PERM_XYZ')) {
            throw new Error('❌ FALHA: Permissão específica não encontrada.');
        }

        // Validação extra: verificar se não está double-stringified
        // Se fosse double-stringified, o JSON response teria algo como "[\"...\"]" que o axios descoderia como string.
        // O check Array.isArray já cobre isso.

        console.log('✅ SUCESSO! Permissões persistidas e retornadas corretamente como array.');

        // Cleanup (Opcional - deixar para auditoria ou deletar)
        // await axios.delete(`${API_URL}/users/${userId}`, { headers });

    } catch (err: any) {
        console.error('❌ ERRO:', err.response?.data || err.message);
        process.exit(1);
    }
}

testPermissionsFix();
