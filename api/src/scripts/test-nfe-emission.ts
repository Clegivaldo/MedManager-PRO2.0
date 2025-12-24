/**
 * Script de teste para emissão de NF-e em homologação
 * Execução: pnpm ts-node src/scripts/test-nfe-emission.ts
 * 
 * IMPORTANTE: Este script SEMPRE emite em HOMOLOGAÇÃO, nunca em produção
 */

import { prismaMaster } from '../lib/prisma.js';
import { NFeService } from '../services/nfe.service.js';
import { logger } from '../utils/logger.js';

// ID da tenant com certificado configurado
const TENANT_ID = process.env.TEST_TENANT_ID || 'e9675bde-126b-429a-a150-533e055e7cc0';

// Dados de teste para NF-e
const TEST_INVOICE = {
  invoiceNumber: 100001,
  invoiceSeries: '1',
  issueDate: new Date('2024-01-15'),
  dueDate: new Date('2024-02-15'),
  
  customer: {
    name: 'Cliente Teste XYZ',
    email: 'cliente@teste.com.br',
    cpfCnpj: '12345678901234', // CPF ou CNPJ válido
    stateRegistration: 'ISENTO', // ISENTO ou número válido
    enderCustomer: {
      street: 'Rua Teste',
      number: '123',
      complement: 'Apto 456',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      country: 'Brasil'
    }
  },

  items: [
    {
      description: 'Serviço de Teste',
      quantity: 1,
      unitValue: 100.00,
      totalValue: 100.00,
      ncm: '69111100', // NCM válido
      cfop: '5101', // CFOP saída
      icms: {
        type: '00', // ICMS normal
        rate: 18.0,
      },
      pis: {
        type: '01',
        rate: 1.65,
      },
      cofins: {
        type: '01',
        rate: 7.6,
      }
    }
  ],

  paymentMethod: 'DINHEIRO',
  total: 100.00,
  subtotal: 100.00,
  icmsTotal: 18.00,
  pisTotal: 1.65,
  cofinsTotal: 7.60,
};

async function testNFeEmission() {
  console.log('\n🧪 Iniciando teste de emissão de NF-e...\n');

  try {
    // 1. Buscar tenant
    console.log(`📋 Buscando tenant: ${TENANT_ID}`);
    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: TENANT_ID },
    });

    if (!tenant) {
      throw new Error(`Tenant não encontrado: ${TENANT_ID}`);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name}`);

    // 2. Buscar perfil fiscal
    console.log(`\n📋 Buscando perfil fiscal...`);
    const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
      where: { tenantId: TENANT_ID },
    });

    if (!fiscalProfile) {
      throw new Error('Perfil fiscal não encontrado para a tenant');
    }

    console.log(`✅ Perfil fiscal encontrado:`);
    console.log(`   CNPJ: ${fiscalProfile.cnpj}`);
    console.log(`   Ambiente: ${fiscalProfile.sefazEnvironment}`);
    console.log(`   Certificado: ${fiscalProfile.certificatePath}`);
    console.log(`   Senha: ${fiscalProfile.certificatePassword?.substring(0, 20)}...`);

    // 3. Verificar se está em homologação
    if (fiscalProfile.sefazEnvironment === 'producao') {
      throw new Error('❌ ERRO CRÍTICO: Tentativa de emissão em PRODUÇÃO bloqueada!');
    }

    console.log(`\n✅ Confirmado: Emissão será realizada em HOMOLOGAÇÃO`);

    // 4. Montar dados de NFe
    console.log(`\n📝 Montando dados de NF-e...`);
    const nfeData = {
      invoice: {
        invoiceNumber: TEST_INVOICE.invoiceNumber,
        invoiceSeries: TEST_INVOICE.invoiceSeries,
        issueDate: TEST_INVOICE.issueDate,
        dueDate: TEST_INVOICE.dueDate,
        total: TEST_INVOICE.total,
        subtotal: TEST_INVOICE.subtotal,
      },
      customer: TEST_INVOICE.customer,
      items: TEST_INVOICE.items,
      paymentMethod: TEST_INVOICE.paymentMethod,
      company: {
        cnpj: fiscalProfile.cnpj,
        registrationNumber: fiscalProfile.registrationNumber,
      },
    };

    // 5. Criar NFeService
    console.log(`\n⚙️  Inicializando serviço de NF-e...`);
    const nfeService = new NFeService();

    // 6. Emitir NF-e
    console.log(`\n🚀 Emitindo NF-e em homologação...`);
    const result = await nfeService.emitNFe(nfeData, TENANT_ID);

    console.log(`\n✅ NF-e EMITIDA COM SUCESSO!\n`);
    console.log(`📊 Resultado:`);
    console.log(`   Número NF-e: ${result.nfeNumber}`);
    console.log(`   Chave acesso: ${result.accessKey}`);
    console.log(`   Protocolo: ${result.protocol}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Data/Hora: ${result.authorizedAt}`);
    console.log(`   XML: ${result.signedXml?.substring(0, 100)}...`);

    if (result.danfeUrl) {
      console.log(`   DANFE: ${result.danfeUrl}`);
    }

    if (result.error) {
      console.log(`   ⚠️  Aviso: ${result.error}`);
    }

    console.log(`\n🎉 Teste concluído com sucesso!`);
    console.log(`\n💾 Salve a chave de acesso para consultas futuras:`);
    console.log(`   ${result.accessKey}`);

  } catch (error) {
    console.error(`\n❌ ERRO durante teste:\n`);
    console.error((error as Error).message);
    
    if (error instanceof Error && error.stack) {
      console.error(`\n📍 Stack trace:`);
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Executar teste
testNFeEmission().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
