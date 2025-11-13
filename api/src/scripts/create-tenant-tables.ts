import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

/**
 * Script para criar tabelas nos bancos de dados dos tenants usando SQL direto
 */
async function createTenantTables() {
  try {
    logger.info('Creating tables in tenant databases...');

    // Buscar todos os tenants
    const tenants = await prismaMaster.tenant.findMany({
      where: { status: 'active' }
    });

    for (const tenant of tenants) {
      try {
        logger.info(`Creating tables for tenant: ${tenant.name} (${tenant.cnpj})`);
        
        // Criar cliente Prisma para o banco do tenant
        const tenantPrisma = new PrismaClient({
          datasources: {
            db: {
              url: `postgresql://${tenant.databaseUser}:${tenant.databasePassword}@localhost:5432/${tenant.databaseName}`
            }
          }
        });
        
        // SQL para criar as tabelas principais
        const createTablesSQL = `
          -- Tabela de usuários
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabela de produtos
          CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            sku VARCHAR(100) UNIQUE NOT NULL,
            barcode VARCHAR(100) UNIQUE,
            ncm VARCHAR(20),
            cest VARCHAR(20),
            unit VARCHAR(10) NOT NULL,
            cost_price DECIMAL(10, 2) NOT NULL,
            sale_price DECIMAL(10, 2) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabela de lotes
          CREATE TABLE IF NOT EXISTS batches (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            number VARCHAR(100) UNIQUE NOT NULL,
            product_id VARCHAR(36) NOT NULL,
            quantity INTEGER NOT NULL,
            expiration TIMESTAMP,
            manufacturing_date TIMESTAMP,
            supplier VARCHAR(255),
            cost_price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id)
          );

          -- Tabela de estoque
          CREATE TABLE IF NOT EXISTS stock (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id VARCHAR(36) NOT NULL,
            batch_id VARCHAR(36) NOT NULL,
            quantity INTEGER NOT NULL,
            reserved INTEGER DEFAULT 0,
            available_quantity INTEGER NOT NULL,
            location VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (batch_id) REFERENCES batches(id),
            UNIQUE(product_id, batch_id)
          );

          -- Tabela de clientes
          CREATE TABLE IF NOT EXISTS customers (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            document VARCHAR(50) UNIQUE NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(50),
            zip_code VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabela de fornecedores
          CREATE TABLE IF NOT EXISTS suppliers (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            document VARCHAR(50) UNIQUE NOT NULL,
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(50),
            zip_code VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabela de notas fiscais
          CREATE TABLE IF NOT EXISTS invoices (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            number VARCHAR(100) UNIQUE NOT NULL,
            series VARCHAR(10) DEFAULT '1',
            type VARCHAR(50) NOT NULL,
            customer_id VARCHAR(36) NOT NULL,
            issue_date TIMESTAMP NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'DRAFT',
            xml_content TEXT,
            pdf_url VARCHAR(500),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
          );

          -- Tabela de itens da nota fiscal
          CREATE TABLE IF NOT EXISTS invoice_items (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id VARCHAR(36) NOT NULL,
            product_id VARCHAR(36) NOT NULL,
            description VARCHAR(500) NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            total_price DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
          );

          -- Tabela de logs de auditoria
          CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(36) NOT NULL,
            action VARCHAR(50) NOT NULL,
            entity VARCHAR(100) NOT NULL,
            entity_id VARCHAR(36) NOT NULL,
            changes TEXT,
            ip_address VARCHAR(50),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Tabela de registros RDC 430
          CREATE TABLE IF NOT EXISTS rdc430_records (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id VARCHAR(36) NOT NULL,
            batch_id VARCHAR(36) NOT NULL,
            operation_type VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            date TIMESTAMP NOT NULL,
            document_number VARCHAR(100) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (batch_id) REFERENCES batches(id)
          );

          -- Tabela de registros SNGPC
          CREATE TABLE IF NOT EXISTS sngpc_records (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id VARCHAR(36) NOT NULL,
            batch_id VARCHAR(36) NOT NULL,
            operation_type VARCHAR(50) NOT NULL,
            quantity INTEGER NOT NULL,
            date TIMESTAMP NOT NULL,
            prescription_number VARCHAR(100),
            patient_name VARCHAR(255),
            patient_document VARCHAR(50),
            doctor_name VARCHAR(255),
            doctor_document VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (batch_id) REFERENCES batches(id)
          );
        `;
        
        // Executar SQL para criar tabelas
        await tenantPrisma.$executeRawUnsafe(createTablesSQL);
        logger.info(`Tables created for tenant: ${tenant.name}`);
        
        // Criar usuário admin padrão para o tenant
        const hashedPassword = await import('../services/auth.service.js').then(m => m.hashPassword('admin123'));
        
        const createAdminSQL = `
          INSERT INTO users (email, name, password, role, is_active)
          VALUES ('admin@${tenant.cnpj}.com', 'Administrador', '${hashedPassword}', 'admin', true)
          ON CONFLICT (email) DO NOTHING;
        `;
        
        await tenantPrisma.$executeRawUnsafe(createAdminSQL);
        logger.info(`Admin user created for tenant: ${tenant.name}`);
        
        // Desconectar do banco do tenant
        await tenantPrisma.$disconnect();
        
      } catch (error) {
        logger.error(`Error creating tables for tenant ${tenant.name}:`, error);
        // Continuar com os próximos tenants mesmo se um falhar
      }
    }

    logger.info('Tenant table creation completed!');

  } catch (error) {
    logger.error('Error during tenant table creation:', error);
    throw error;
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar o script
createTenantTables()
  .then(() => {
    console.log('✅ Tenant table creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tenant table creation failed:', error);
    process.exit(1);
  });