/**
 * Script de teste para emissão de NF-e em homologação
 * Execução: TEST_TENANT_ID=xxx pnpm tsx src/scripts/test-nfe-emission.ts
 * 
 * IMPORTANTE: Este script SEMPRE emite em HOMOLOGAÇÃO, nunca em produção
 */

import { prismaMaster } from '../lib/prisma.js';
import { NFeService } from '../services/nfe.service.js';
import { logger } from '../utils/logger.js';

// ID da tenant com certificado configurado
const TENANT_ID = process.env.TEST_TENANT_ID || 'e9675bde-126b-429a-a150-533e055e7cc0';

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
      throw new Error(`Perfil fiscal não encontrado para tenant: ${TENANT_ID}`);
    }

    console.log(`✅ Perfil fiscal encontrado:`);
    console.log(`   CNPJ: ${fiscalProfile.cnpj}`);
    console.log(`   Ambiente: ${fiscalProfile.sefazEnvironment}`);
    console.log(`   Certificado: ${fiscalProfile.certificatePath}`);
    console.log(`   Senha: ${fiscalProfile.certificatePassword?.substring(0, 20)}...`);

    // 3. Verificar se existe série fiscal, se não existir criar
    console.log(`\n📋 Verificando série fiscal...`);
    let fiscalSeries = await prismaMaster.fiscalSeries.findFirst({
      where: {
        fiscalProfileId: fiscalProfile.id,
        invoiceType: 'EXIT',
        isActive: true,
      },
    });

    if (!fiscalSeries) {
      console.log(`⚙️  Criando série fiscal...`);
      fiscalSeries = await prismaMaster.fiscalSeries.create({
        data: {
          fiscalProfileId: fiscalProfile.id,
          seriesNumber: 1,
          invoiceType: 'EXIT',
          nextNumber: 1,
          isActive: true,
        },
      });
      console.log(`✅ Série fiscal criada: Série ${fiscalSeries.seriesNumber}`);
    } else {
      console.log(`✅ Série fiscal encontrada: Série ${fiscalSeries.seriesNumber}, Próximo número: ${fiscalSeries.nextNumber}`);
    }

    // 4. Verificar se está em homologação
    if (fiscalProfile.sefazEnvironment !== 'homologacao') {
      throw new Error('⚠️  ERRO: Ambiente não é homologação! Este script só funciona em HOMOLOGAÇÃO.');
    }

    console.log(`\n✅ Confirmado: Emissão será realizada em HOMOLOGAÇÃO`);

    // 5. Montar dados de NFe com estrutura correta conforme interface NFeInvoiceData
    console.log(`\n📝 Montando dados de NF-e...`);
    const nfeData = {
      invoice: {
        id: 'test-invoice-001',
        invoiceNumber: '100001',
        operationType: 'SAIDA',
        cfop: '5102',
        naturezaOperacao: 'Venda de mercadoria',
        paymentMethod: 'DINHEIRO',
        installments: 1,
        observations: 'Nota fiscal emitida em ambiente de homologação para teste',
        subtotal: 100.00,
        discount: 0,
        tax: 27.25,
        total: 127.25,
        createdAt: new Date(),
      },
      issuer: {
        cnpj: fiscalProfile.cnpj,
        name: fiscalProfile.companyName || fiscalProfile.tradingName || 'Empresa Teste',
        stateRegistration: fiscalProfile.stateRegistration || 'ISENTO',
        municipalRegistration: fiscalProfile.municipalRegistration || undefined,
        address: JSON.stringify({
          street: 'Rua Teste Emissor',
          number: '123',
          district: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        }),
        phone: fiscalProfile.phone || undefined,
        email: fiscalProfile.email || undefined,
      },
      customer: {
        id: 'test-customer-001',
        name: 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL', // Nome especial para homologação
        cnpjCpf: '07434011000175', // CNPJ válido para teste
        email: 'cliente@teste.com.br',
        phone: '(11) 99999-9999',
        address: JSON.stringify({
          street: 'Rua Cliente',
          number: '456',
          district: 'Vila Teste',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310200',
        }),
        stateRegistration: 'ISENTO',
        customerType: 'PESSOA_JURIDICA',
      },
      items: [
        {
          id: 'test-item-001',
          product: {
            id: 'test-product-001',
            name: 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL', // Nome especial para homologação
            ncm: '30049099', // NCM para medicamentos diversos
            unit: 'UN',
            gtin: '',
            cest: '',
            cfop: '5102',
          },
          quantity: 1,
          unitPrice: 100.00,
          discount: 0,
          subtotal: 100.00,
          total: 100.00,
          icms: 18.00,
        }
      ],
      payments: [
        {
          method: 'DINHEIRO',
          amount: 127.25,
          status: 'PAID',
        }
      ],
    };

    // 6. Criar NFeService
    console.log(`\n⚙️  Inicializando serviço de NF-e...`);
    const nfeService = new NFeService();

    // 7. Emitir NF-e
    console.log(`\n🚀 Emitindo NF-e em homologação...`);
    const result = await nfeService.emitNFe(nfeData, TENANT_ID);

    console.log(`\n✅ NF-e EMITIDA COM SUCESSO!\n`);
    console.log(`📊 Resultado:`);
    console.log(`   Número NF-e: ${result.nfeNumber}`);
    console.log(`   Chave acesso: ${result.accessKey}`);
    console.log(`   Protocolo: ${result.protocol}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Data/Hora: ${result.authorizedAt}`);
    
    if (result.signedXml) {
      console.log(`   XML: ${result.signedXml.substring(0, 100)}...`);
    }

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
  } finally {
    await prismaMaster.$disconnect();
  }
}

// Executar teste
testNFeEmission()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
