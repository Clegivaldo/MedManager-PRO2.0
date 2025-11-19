import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/environment.js';
import { hashPassword } from '../services/auth.service.js';
import { UserRole } from '@prisma/client';

export interface TenantCreationData {
  name: string;
  cnpj: string;
  plan: 'starter' | 'professional' | 'enterprise';
  metadata?: {
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
  };
}

export interface TenantFolderStructure {
  uploads: string;
  backups: string;
  documents: string;
  reports: string;
  logs: string;
}

/**
 * Serviço de gerenciamento de tenants com isolamento completo
 */
export class TenantService {
  /**
   * Criar novo tenant com banco de dados e pastas isoladas
   */
  async createTenant(data: TenantCreationData) {
    const { name, cnpj, plan, metadata = {} } = data;

    try {
      // Gerar nomes únicos para banco e usuário
      const tenantId = this.generateTenantId();
      const databaseName = `tenant_${tenantId}`;
      const databaseUser = `tenant_${tenantId}`;
      const databasePassword = this.generateSecurePassword();

      logger.info(`Creating tenant: ${name} (${cnpj})`);

      // Criar banco de dados do tenant
      await this.createTenantDatabase(databaseName, databaseUser, databasePassword);

      // Criar estrutura de pastas isoladas
      const folderStructure = await this.createTenantFolderStructure(cnpj);

      // Salvar tenant no banco mestre
      const tenant = await prismaMaster.tenant.create({
        data: {
          name,
          cnpj,
          databaseName,
          databaseUser,
          databasePassword,
          plan,
          status: 'active',
          metadata: JSON.stringify(metadata),
        }
      });

      // Executar migrations no banco do tenant
      await this.runTenantMigrations(databaseName);

      // Criar usuário admin padrão para o tenant
      await this.createDefaultAdminUser(databaseName, name);

      logger.info(`Tenant created successfully: ${tenant.id} - ${name}`);

      return {
        tenant,
        databaseName,
        folderStructure
      };
    } catch (error) {
      logger.error(`Error creating tenant ${name}:`, error);
      throw error;
    }
  }

  /**
   * Obter tenant por ID ou CNPJ
   */
  async getTenant(identifier: string) {
    const tenant = await prismaMaster.tenant.findFirst({
      where: {
        OR: [
          { id: identifier },
          { cnpj: identifier }
        ]
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }

  /**
   * Listar todos os tenants
   */
  async listTenants(filters?: {
    status?: string;
    plan?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.plan) {
      where.plan = filters.plan;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { cnpj: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return await prismaMaster.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Atualizar tenant
   */
  async updateTenant(id: string, data: Partial<TenantCreationData>) {
    const updateData: any = { ...data };
    if (data.metadata) {
      updateData.metadata = JSON.stringify(data.metadata);
    }
    return await prismaMaster.tenant.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Desativar tenant (soft delete)
   */
  async deactivateTenant(id: string) {
    return await prismaMaster.tenant.update({
      where: { id },
      data: { status: 'inactive' }
    });
  }

  /**
   * Ativar tenant
   */
  async activateTenant(id: string) {
    return await prismaMaster.tenant.update({
      where: { id },
      data: { status: 'active' }
    });
  }

  /**
   * Criar banco de dados para o tenant
   */
  async createTenantDatabase(
    databaseName: string, 
    databaseUser: string, 
    databasePassword: string
  ) {
    try {
      logger.info(`Creating database: ${databaseName}`);

      // Criar banco de dados
      const createDbSQL = `CREATE DATABASE "${databaseName}" WITH OWNER postgres ENCODING 'UTF8';`;
      execSync(`psql "${config.DATABASE_URL}" -c "${createDbSQL}"`, { stdio: 'inherit' });

      // Criar usuário do tenant
      const createUserSQL = `CREATE USER "${databaseUser}" WITH PASSWORD '${databasePassword}';`;
      execSync(`psql "${config.DATABASE_URL}" -c "${createUserSQL}"`, { stdio: 'inherit' });

      // Conceder permissões
      const grantPermissionsSQL = `
        GRANT CONNECT ON DATABASE "${databaseName}" TO "${databaseUser}";
        GRANT USAGE ON SCHEMA public TO "${databaseUser}";
        GRANT CREATE ON SCHEMA public TO "${databaseUser}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${databaseUser}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${databaseUser}";
      `;
      execSync(`psql "${config.DATABASE_URL}" -c "${grantPermissionsSQL}"`, { stdio: 'inherit' });

      logger.info(`Database ${databaseName} created successfully`);
    } catch (error) {
      logger.error(`Error creating database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Criar estrutura de pastas isoladas para o tenant
   */
  private async createTenantFolderStructure(cnpj: string): Promise<TenantFolderStructure> {
    const basePath = path.join(config.UPLOAD_DIR, 'tenants', cnpj.replace(/[^\d]/g, ''));
    
    const folders = {
      uploads: path.join(basePath, 'uploads'),
      backups: path.join(basePath, 'backups'),
      documents: path.join(basePath, 'documents'),
      reports: path.join(basePath, 'reports'),
      logs: path.join(basePath, 'logs')
    };

    try {
      // Criar diretório base
      await fs.mkdir(basePath, { recursive: true });

      // Criar subdiretórios
      for (const folderPath of Object.values(folders)) {
        await fs.mkdir(folderPath, { recursive: true });
        
        // Criar arquivo .gitkeep para manter diretório no git
        await fs.writeFile(path.join(folderPath, '.gitkeep'), '');
      }

      // Criar arquivo de segurança .htaccess (se for Apache)
      const htaccessContent = `Deny from all`;
      for (const folderPath of Object.values(folders)) {
        await fs.writeFile(path.join(folderPath, '.htaccess'), htaccessContent);
      }

      logger.info(`Folder structure created for tenant ${cnpj}`);
      return folders;
    } catch (error) {
      logger.error(`Error creating folder structure for tenant ${cnpj}:`, error);
      throw error;
    }
  }

  /**
   * Executar migrations no banco do tenant
   */
  async runTenantMigrations(databaseName: string) {
    try {
      logger.info(`Running migrations for database: ${databaseName}`);

      // URL de conexão com o banco do tenant
      const tenantDatabaseUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${databaseName}`);

      // Executar migrations usando Prisma Migrate
      execSync(`cd ${process.cwd()} && DATABASE_URL="${tenantDatabaseUrl}" npx prisma migrate deploy`, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: tenantDatabaseUrl }
      });

      logger.info(`Migrations completed for database: ${databaseName}`);
    } catch (error) {
      logger.error(`Error running migrations for database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Criar usuário admin padrão para o tenant
   */
  async createDefaultAdminUser(databaseName: string, tenantName: string) {
    try {
      logger.info(`Creating default admin user for tenant: ${tenantName}`);

      // Importar Prisma Client para o tenant específico
      const { PrismaClient } = await import('@prisma/client');
      const prismaTenant = new PrismaClient({
        datasources: {
          db: {
            url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${databaseName}`)
          }
        }
      });

      // Criar usuário admin padrão
      await prismaTenant.user.create({
        data: {
          email: 'admin@medmanager.com.br',
          name: 'Administrador',
          password: await hashPassword('admin123'),
          role: UserRole.ADMIN,
          isActive: true,
          permissions: '[]'
        }
      });

      await prismaTenant.$disconnect();

      logger.info(`Default admin user created for tenant: ${tenantName}`);
    } catch (error) {
      logger.error(`Error creating default admin user for tenant ${tenantName}:`, error);
      throw error;
    }
  }

  /**
   * Gerar ID único para o tenant
   */
  private generateTenantId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Gerar senha segura
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

export const tenantService = new TenantService();