/**
 * Script para criptografar todas as senhas de certificado já armazenadas em texto simples
 * Execução: pnpm ts-node src/scripts/encrypt-certificate-passwords.ts
 */

import { prismaMaster } from '../lib/prisma.js';
import { encrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

async function main() {
  console.log('🔒 Iniciando criptografia de senhas de certificados...\n');

  try {
    // Buscar todos os perfis fiscais com senha de certificado
    const profiles = await prismaMaster.tenantFiscalProfile.findMany({
      where: {
        certificatePassword: {
          not: null,
        },
      },
      select: {
        id: true,
        tenantId: true,
        certificatePassword: true,
        companyName: true,
      },
    });

    if (profiles.length === 0) {
      console.log('✅ Nenhuma senha de certificado encontrada para criptografar.');
      process.exit(0);
    }

    console.log(`📋 Encontradas ${profiles.length} senhas para criptografar:\n`);

    let encrypted = 0;
    let skipped = 0;

    for (const profile of profiles) {
      try {
        // Verificar se já está criptografada (formato v1:...)
        if (profile.certificatePassword!.includes(':')) {
          console.log(`⏭️  PULADO: ${profile.companyName} (${profile.id}) - já está criptografada`);
          skipped++;
          continue;
        }

        // Criptografar a senha
        const encryptedPassword = encrypt(profile.certificatePassword!);

        // Atualizar no banco
        await prismaMaster.tenantFiscalProfile.update({
          where: { id: profile.id },
          data: {
            certificatePassword: encryptedPassword,
          },
        });

        console.log(`✅ CRIPTOGRAFADA: ${profile.companyName} (${profile.id})`);
        encrypted++;
      } catch (error) {
        console.error(`❌ ERRO ao criptografar ${profile.companyName}: ${(error as Error).message}`);
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   - Total processados: ${profiles.length}`);
    console.log(`   - Criptografadas: ${encrypted}`);
    console.log(`   - Puladas (já criptografadas): ${skipped}`);

    if (encrypted > 0) {
      console.log(`\n✅ Senhas de certificados criptografadas com sucesso!`);
      console.log(`\n⚠️  IMPORTANTE:`);
      console.log(`   - A descriptografia ocorre automaticamente ao emitir NF-e`);
      console.log(`   - Certifique-se de que ENCRYPTION_KEY está configurada no .env`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro crítico:', (error as Error).message);
    process.exit(1);
  }
}

main();
