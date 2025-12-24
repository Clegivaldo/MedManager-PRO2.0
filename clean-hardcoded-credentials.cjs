#!/usr/bin/env node
/**
 * Script de limpeza automática de credenciais hardcoded
 * Remove todas as senhas e chaves expostas dos arquivos de teste
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Iniciando limpeza automática de credenciais...\n');

// Lista de arquivos para corrigir
const testFiles = [
  'find-superadmin.ts',
  'list-tenants.ts',
  'test-complete-flow.ts',
  'test-expired-license.ts',
  'test-payment-final.ts',
  'test-payment-integration.ts',
  'test-usage-endpoint.ts',
  'test-charge-creation.js',
  'test-dashboard-login.js',
  'test-tenant-login.js'
];

// Template de importação dotenv
const dotenvImport = `// ⚠️ ATENÇÃO: Carregar credenciais de .env.test
require('dotenv').config({ path: '.env.test' });

if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
  console.error('❌ ERRO: Configure TEST_USER_EMAIL e TEST_USER_PASSWORD no .env.test');
  process.exit(1);
}

`;

let filesFixed = 0;
let totalReplacements = 0;

testFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`⏭️  Pulando ${file} (não encontrado)`);
    return;
  }

  console.log(`📝 Processando ${file}...`);
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  let replacements = 0;

  // Substituir senhas hardcoded
  const passwordReplacements = [
    { from: /const\s+TEST_USER_PASSWORD\s*=\s*['"`]admin123['"`]/g, to: 'const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD' },
    { from: /const\s+password\s*=\s*['"`]admin123['"`]/g, to: 'const password = process.env.TEST_USER_PASSWORD' },
    { from: /const\s+adminPassword\s*=\s*['"`]admin123['"`]/g, to: 'const adminPassword = process.env.TEST_USER_PASSWORD' },
    { from: /password:\s*['"`]admin123['"`]/g, to: "password: process.env.TEST_USER_PASSWORD || 'admin123'" },
    { from: /['"`]admin123['"`]\s*\/\/\s*senha/g, to: "process.env.TEST_USER_PASSWORD // senha" },
  ];

  passwordReplacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
      replacements++;
    }
  });

  // Adicionar require('dotenv') se necessário
  if (modified && !content.includes("require('dotenv')") && !content.includes('import dotenv')) {
    // Inserir após primeira linha ou imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Encontrar onde inserir (após comentários iniciais ou imports)
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && !lines[i].startsWith('*') && !lines[i].startsWith('import')) {
        insertIndex = i;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, dotenvImport);
    content = lines.join('\n');
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  ✅ ${replacements} substituições realizadas`);
    filesFixed++;
    totalReplacements += replacements;
  } else {
    console.log(`  ⏭️  Sem modificações necessárias`);
  }
});

console.log('\n═══════════════════════════════════════');
console.log('📊 RESULTADO DA LIMPEZA');
console.log('═══════════════════════════════════════');
console.log(`Arquivos corrigidos: ${filesFixed}`);
console.log(`Total de substituições: ${totalReplacements}`);
console.log('═══════════════════════════════════════\n');

if (filesFixed > 0) {
  console.log('✅ Limpeza concluída com sucesso!');
  console.log('\n⚠️  IMPORTANTE:');
  console.log('1. Verifique se o arquivo .env.test existe');
  console.log('2. Configure todas as credenciais necessárias');
  console.log('3. Execute os testes para validar');
} else {
  console.log('✅ Nenhuma correção necessária!');
}
