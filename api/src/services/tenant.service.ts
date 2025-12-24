import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/environment.js';
import { hashPassword } from '../services/auth.service.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import pkg from '@prisma/client';
const UserRole = (pkg as any).UserRole as any;

const execAsync = promisify(exec);

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

      // Salvar tenant no banco mestre (com senha criptografada)
      const tenant = await prismaMaster.tenant.create({
        data: {
          name,
          cnpj,
          databaseName,
          databaseUser,
          databasePassword: encrypt(databasePassword), // ✅ Criptografado com AES-256-GCM
          plan,
          status: 'active',
          metadata: JSON.stringify(metadata),
        }
      });

      // Executar migrations no banco do tenant
      await this.runTenantMigrations(databaseName);

      // Criar usuário admin padrão para o tenant (usar email metadata se fornecido)
      await this.createDefaultAdminUser(databaseName, name, metadata.email);

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
      // Validação de segurança para evitar injection
      this.validateIdentifier(databaseName);
      this.validateIdentifier(databaseUser);
      // Senha é gerada internamente, então é segura, mas vamos escapar aspas simples por precaução
      const safePassword = databasePassword.replace(/'/g, "''");

      logger.info(`Creating database: ${databaseName}`);

      // Criar banco de dados
      const createDbSQL = `CREATE DATABASE "${databaseName}" WITH OWNER postgres ENCODING 'UTF8';`;
      await execAsync(`psql "${config.DATABASE_URL}" -c "${createDbSQL}"`);

      // Criar usuário do tenant
      const createUserSQL = `CREATE USER "${databaseUser}" WITH PASSWORD '${safePassword}';`;
      await execAsync(`psql "${config.DATABASE_URL}" -c "${createUserSQL}"`);

      // Conceder permissões
      const grantPermissionsSQL = `
        GRANT CONNECT ON DATABASE "${databaseName}" TO "${databaseUser}";
        GRANT USAGE ON SCHEMA public TO "${databaseUser}";
        GRANT CREATE ON SCHEMA public TO "${databaseUser}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${databaseUser}";
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${databaseUser}";
      `;
      await execAsync(`psql "${config.DATABASE_URL}" -c "${grantPermissionsSQL}"`);

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
      this.validateIdentifier(databaseName);
      logger.info(`Running migrations for database: ${databaseName}`);

      // Buscar database_user do tenant
      const tenant = await prismaMaster.tenant.findFirst({
        where: { databaseName },
        select: { databaseUser: true }
      });

      if (!tenant) {
        throw new Error(`Tenant not found for database: ${databaseName}`);
      }

      // URL de conexão com o banco do tenant
      const tenantDatabaseUrl = config.DATABASE_URL.replace(/\/(\w+)$/, `/${databaseName}`);

      // Executar migrations usando Prisma Migrate
      // Nota: Prisma CLI precisa de um shell, então mantemos o comando como string
      await execAsync(`cd ${process.cwd()} && DATABASE_URL="${tenantDatabaseUrl}" npx prisma migrate deploy`, {
        env: { ...process.env, DATABASE_URL: tenantDatabaseUrl }
      });

      logger.info(`Migrations completed for database: ${databaseName}`);

      // Conceder permissões nas tabelas existentes (migrations já criaram as tabelas)
      // Isso é necessário porque ALTER DEFAULT PRIVILEGES só afeta tabelas FUTURAS
      const grantExistingTablesSQL = `
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${tenant.databaseUser}";
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${tenant.databaseUser}";
      `;
      await execAsync(`psql "${tenantDatabaseUrl}" -c "${grantExistingTablesSQL}"`);
      logger.info(`Granted permissions on existing tables for database: ${databaseName}`);
    } catch (error) {
      logger.error(`Error running migrations for database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Criar usuário admin padrão para o tenant
   */
  async createDefaultAdminUser(databaseName: string, tenantName: string, adminEmail?: string) {
    try {
      logger.info(`Creating default admin user for tenant: ${tenantName}`);

      // Importar Prisma Client para o tenant específico (runtime)
      const pkg = await import('@prisma/client');
      const PrismaClientRuntime = (pkg as any).PrismaClient as any;
      const prismaTenant = new PrismaClientRuntime({
        datasources: {
          db: {
            url: config.DATABASE_URL.replace(/\/(\w+)$/, `/${databaseName}`)
          }
        }
      });

      // Criar usuário admin padrão
      const emailToUse = (adminEmail || 'admin@medmanager.com.br').toLowerCase();

      // Verificar se já existe usuário com esse email para evitar duplicar
      const existing = await prismaTenant.user.findUnique({ where: { email: emailToUse } });
      if (!existing) {
        // Importar permissões para dar acesso completo ao admin
        const { ROLES } = await import('../middleware/permissions.js');
        const adminPermissions = ROLES.MASTER.permissions;

        await prismaTenant.user.create({
          data: {
            email: emailToUse,
            name: 'Administrador',
            password: await hashPassword('admin123'),
            role: UserRole.MASTER,
            isActive: true,
            permissions: JSON.stringify(adminPermissions)
          }
        });
        logger.info(`Default admin user created (${emailToUse}) for tenant: ${tenantName}`);
      } else {
        logger.info(`Admin user already exists (${emailToUse}) for tenant: ${tenantName}`);
      }

      await prismaTenant.$disconnect();

      // Informação já logada acima
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

  /**
   * Validar identificadores para evitar SQL Injection em comandos do sistema
   */
  private validateIdentifier(identifier: string) {
    if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
  }

  /**
   * Obter senha descriptografada do banco de dados do tenant
   * @param encryptedPassword - Senha criptografada armazenada
   * @returns Senha em texto plano para uso em conexões
   */
  getDecryptedPassword(encryptedPassword: string): string {
    const decrypted = decrypt(encryptedPassword);
    if (!decrypted) {
      throw new Error('Failed to decrypt database password');
    }
    return decrypted;
  }
}

export const tenantService = new TenantService();