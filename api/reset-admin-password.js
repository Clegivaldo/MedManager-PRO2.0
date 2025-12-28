// Script para resetar senha do usuário admin
// Executa dentro do container backend
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
    // Conectar ao banco do tenant demo
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://postgres:postgres123@db:5432/medmanager_tenant_demo'
            }
        }
    });

    try {
        console.log('🔐 Resetando senha do admin...');

        // Gerar hash da senha
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('✅ Hash gerado:', hashedPassword);
        console.log('📏 Tamanho do hash:', hashedPassword.length);

        // Array de permissões completas para MASTER
        const masterPermissions = [
            "super_admin", "tenant_create", "tenant_read", "tenant_update", "tenant_delete",
            "tenant_manage_plan", "tenant_manage_status", "user_create", "user_read",
            "user_update", "user_delete", "user_manage_roles", "user_manage_permissions",
            "product_create", "product_read", "product_update", "product_delete",
            "product_manage_stock", "product_manage_prices", "product_view_costs",
            "batch_create", "batch_read", "batch_update", "batch_delete",
            "batch_manage_expiry", "batch_manage_location", "inventory_view",
            "inventory_adjust", "inventory_transfer", "inventory_count",
            "customer_create", "customer_read", "customer_update", "customer_delete",
            "customer_view_documents", "supplier_create", "supplier_read",
            "supplier_update", "supplier_delete", "supplier_manage_contracts",
            "invoice_create", "invoice_read", "invoice_update", "invoice_delete",
            "invoice_cancel", "invoice_print", "invoice_email", "nfe_issue",
            "nfe_cancel", "nfe_correct", "nfe_view_xml", "nfe_view_danfe",
            "financial_view", "financial_manage_payments", "financial_manage_receipts",
            "financial_view_reports", "dashboard_view", "reports_view", "reports_create",
            "reports_export", "analytics_view", "regulatory_view",
            "regulatory_manage_sngpc", "regulatory_manage_sncm", "regulatory_view_audit",
            "regulatory_manage_prescription", "regulatory_manage_controlled_substances",
            "controlled_create", "controlled_read", "controlled_update", "controlled_delete",
            "controlled_manage_stock", "controlled_view_movements", "controlled_generate_g33",
            "audit_view", "audit_export", "logs_view", "logs_manage",
            "backup_create", "backup_restore", "backup_view", "backup_manage",
            "system_config", "system_maintenance", "system_update",
            "file_upload", "file_download", "file_delete", "file_manage"
        ];

        // Atualizar usuário com senha e permissões
        const user = await prisma.user.update({
            where: { email: 'admin@farmaciademo.com.br' },
            data: {
                password: hashedPassword,
                permissions: masterPermissions
            }
        });

        console.log('✅ Senha atualizada com sucesso!');
        console.log('👤 Usuário:', user.email);

        // Verificar se a senha funciona
        const isValid = await bcrypt.compare(password, hashedPassword);
        console.log('✅ Validação do hash:', isValid ? 'OK' : 'FALHOU');

        // Buscar e mostrar info do usuário
        const updated = await prisma.user.findUnique({
            where: { email: 'admin@farmaciademo.com.br' },
            select: {
                email: true,
                name: true,
                role: true,
                isActive: true,
                password: true
            }
        });

        console.log('\n📊 Informações do usuário:');
        console.log('Email:', updated.email);
        console.log('Nome:', updated.name);
        console.log('Role:', updated.role);
        console.log('Ativo:', updated.isActive);
        console.log('Hash length:', updated.password.length);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword()
    .then(() => {
        console.log('\n✅ Script concluído com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script falhou:', error);
        process.exit(1);
    });
