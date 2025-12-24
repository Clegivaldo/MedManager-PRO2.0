/**
 * Script de migração de segurança
 * Criptografa senhas de banco de dados dos tenants já existentes
 * 
 * ATENÇÃO: Execute este script APENAS UMA VEZ após deploy da nova versão
 * 
 * Uso:
 * npx ts-node api/src/scripts/migrate-encrypt-passwords.ts
 */

import { prismaMaster } from '../lib/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

async function migrateEncryptPasswords() {
  try {
    logger.info('🔒 Iniciando migração de criptografia de senhas...');

    // Buscar todos os tenants
    const tenants = await prismaMaster.tenant.findMany({
      select: {
        id: true,
        name: true,
        databasePassword: true,
      }
    });

    logger.info(`📊 Encontrados ${tenants.length} tenants para migração`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        // Verificar se já está criptografada (formato: v1:iv:tag:data)
        if (tenant.databasePassword.startsWith('v1:')) {
          logger.info(`⏭️  Tenant ${tenant.name} já possui senha criptografada. Pulando...`);
          skipped++;
          continue;
        }

        // Tentar descriptografar - se funcionar, já está criptografada (formato antigo)
        const testDecrypt = decrypt(tenant.databasePassword);
        if (testDecrypt) {
          logger.info(`⏭️  Tenant ${tenant.name} já possui senha criptografada (formato antigo). Pulando...`);
          skipped++;
          continue;
        }

        // Se chegou aqui, a senha está em texto plano
        logger.info(`🔐 Criptografando senha do tenant: ${tenant.name}`);

        // Criptografar a senha em texto plano
        const encryptedPassword = encrypt(tenant.databasePassword);

        // Atualizar no banco
        await prismaMaster.tenant.update({
          where: { id: tenant.id },
          data: { databasePassword: encryptedPassword }
        });

        // Verificar se a criptografia funcionou
        const decrypted = decrypt(encryptedPassword);
        if (decrypted === tenant.databasePassword) {
          logger.info(`✅ Senha do tenant ${tenant.name} criptografada com sucesso`);
          migrated++;
        } else {
          throw new Error('Falha na validação da criptografia');
        }

      } catch (error) {
        logger.error(`❌ Erro ao migrar tenant ${tenant.name}:`, error);
        errors++;
      }
    }

    logger.info('\n📊 Relatório de Migração:');
    logger.info(`✅ Migrados: ${migrated}`);
    logger.info(`⏭️  Pulados: ${skipped}`);
    logger.info(`❌ Erros: ${errors}`);
    logger.info(`📊 Total: ${tenants.length}`);

    if (errors > 0) {
      throw new Error(`Migração concluída com ${errors} erro(s)`);
    }

    logger.info('✅ Migração concluída com sucesso!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Erro fatal na migração:', error);
    process.exit(1);
  }
}

// Executar migração
migrateEncryptPasswords();
