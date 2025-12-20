/**
 * Builder para geração de XML NFe versão 4.00
 * Conforme Manual de Integração - Contribuinte v7.0
 */

export interface NFeXmlData {
  // Identificação da NF-e
  ide: {
    cUF: string; // Código UF do emitente
    natOp: string; // Natureza da operação
    mod: string; // Modelo do documento fiscal (55 = NFe)
    serie: string; // Série do documento
    nNF: string; // Número da NF-e
    dhEmi: string; // Data e hora de emissão (formato ISO)
    tpNF: '0' | '1'; // 0=Entrada, 1=Saída
    idDest: '1' | '2' | '3'; // 1=Operação interna, 2=Interestadual, 3=Exterior
    cMunFG: string; // Código município do fato gerador
    tpImp: '1' | '2' | '3' | '4' | '5'; // Formato de impressão do DANFE
    tpEmis: '1'; // Tipo de emissão (1=Normal)
    tpAmb: '1' | '2'; // 1=Produção, 2=Homologação
    finNFe: '1' | '2' | '3' | '4'; // Finalidade (1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução)
    indFinal: '0' | '1'; // 0=Normal, 1=Consumidor final
    indPres: '0' | '1' | '2' | '3' | '4' | '9'; // Indicador de presença
    procEmi: '0'; // Processo de emissão (0=Aplicação do contribuinte)
    verProc: string; // Versão do aplicativo
  };

  // Emitente
  emit: {
    CNPJ: string;
    xNome: string; // Razão social
    xFant?: string; // Nome fantasia
    IE: string; // Inscrição estadual
    IM?: string; // Inscrição municipal
    CNAE?: string;
    CRT: '1' | '2' | '3'; // Código de Regime Tributário (1=Simples Nacional)
    enderEmit: {
      xLgr: string; // Logradouro
      nro: string; // Número
      xCpl?: string; // Complemento
      xBairro: string;
      cMun: string; // Código município IBGE
      xMun: string; // Nome município
      UF: string;
      CEP: string;
      cPais: string; // Código país (1058=Brasil)
      xPais: string; // Nome país
      fone?: string;
    };
  };

  // Destinatário
  dest: {
    CNPJ?: string;
    CPF?: string;
    xNome: string;
    indIEDest: '1' | '2' | '9'; // 1=Contribuinte ICMS, 2=Isento, 9=Não Contribuinte
    IE?: string;
    email?: string;
    enderDest?: {
      xLgr: string;
      nro: string;
      xCpl?: string;
      xBairro: string;
      cMun: string;
      xMun: string;
      UF: string;
      CEP: string;
      cPais: string;
      xPais: string;
      fone?: string;
    };
  };

  // Produtos/Serviços
  det: Array<{
    nItem: string; // Número do item (sequencial)
    prod: {
      cProd: string; // Código do produto
      cEAN?: string; // GTIN/EAN
      xProd: string; // Descrição do produto
      NCM: string; // Código NCM
      CFOP: string;
      uCom: string; // Unidade comercial
      qCom: string; // Quantidade comercial
      vUnCom: string; // Valor unitário
      vProd: string; // Valor total bruto
      cEANTrib?: string;
      uTrib: string; // Unidade tributável
      qTrib: string; // Quantidade tributável
      vUnTrib: string; // Valor unitário tributável
      vDesc?: string; // Valor do desconto
      indTot: '0' | '1'; // Indica se compõe total da NF-e
    };
    imposto: {
      vTotTrib?: string; // Total tributos aproximado
      ICMS: {
        // Grupo ICMS - Simples Nacional
        ICMSSN102?: {
          orig: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'; // Origem da mercadoria
          CSOSN: string; // Código de Situação da Operação - Simples Nacional
        };
      };
      PIS: {
        PISOutr?: {
          CST: string;
          vBC?: string;
          pPIS?: string;
          vPIS: string;
        };
      };
      COFINS: {
        COFINSOutr?: {
          CST: string;
          vBC?: string;
          pCOFINS?: string;
          vCOFINS: string;
        };
      };
    };
  }>;

  // Totais
  total: {
    ICMSTot: {
      vBC: string; // Base de cálculo ICMS
      vICMS: string; // Valor total ICMS
      vICMSDeson: string; // Valor ICMS desonerado
      vFCP: string; // Valor total FCP
      vBCST: string; // Base de cálculo ICMS ST
      vST: string; // Valor total ICMS ST
      vFCPST: string; // Valor total FCP ST
      vFCPSTRet: string; // Valor total FCP retido anteriormente
      vProd: string; // Valor total dos produtos
      vFrete: string; // Valor total do frete
      vSeg: string; // Valor total do seguro
      vDesc: string; // Valor total do desconto
      vII: string; // Valor total II
      vIPI: string; // Valor total IPI
      vIPIDevol: string; // Valor total IPI devolvido
      vPIS: string; // Valor total PIS
      vCOFINS: string; // Valor total COFINS
      vOutro: string; // Outras despesas
      vNF: string; // Valor total da NF-e
      vTotTrib?: string; // Valor aproximado total de tributos
    };
  };

  // Transporte
  transp: {
    modFrete: '0' | '1' | '2' | '3' | '4' | '9'; // 9=Sem frete
  };

  // Pagamento
  pag: {
    detPag: Array<{
      indPag?: '0' | '1'; // 0=Pagamento à vista, 1=Pagamento a prazo
      tPag: string; // Meio de pagamento (01=Dinheiro, 03=Cartão Crédito, etc)
      vPag: string; // Valor do pagamento
    }>;
  };

  // Informações adicionais
  infAdic?: {
    infCpl?: string; // Informações complementares
  };
}

/**
 * Gera XML NFe 4.00 conforme layout da Receita Federal
 */
export function buildNFeXml(data: NFeXmlData, accessKey: string): string {
  const { ide, emit, dest, det, total, transp, pag, infAdic } = data;

  // Calcular dígito verificador da chave de acesso
  const cDV = calculateCheckDigit(accessKey.substring(0, 43));
  const fullAccessKey = accessKey.substring(0, 43) + cDV;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe Id="NFe${fullAccessKey}" versao="4.00">
<ide>
<cUF>${ide.cUF}</cUF>
<cNF>${accessKey.substring(35, 43)}</cNF>
<natOp>${escapeXml(ide.natOp)}</natOp>
<mod>${ide.mod}</mod>
<serie>${ide.serie}</serie>
<nNF>${ide.nNF}</nNF>
<dhEmi>${ide.dhEmi}</dhEmi>
<tpNF>${ide.tpNF}</tpNF>
<idDest>${ide.idDest}</idDest>
<cMunFG>${ide.cMunFG}</cMunFG>
<tpImp>${ide.tpImp}</tpImp>
<tpEmis>${ide.tpEmis}</tpEmis>
<cDV>${cDV}</cDV>
<tpAmb>${ide.tpAmb}</tpAmb>
<finNFe>${ide.finNFe}</finNFe>
<indFinal>${ide.indFinal}</indFinal>
<indPres>${ide.indPres}</indPres>
<procEmi>${ide.procEmi}</procEmi>
<verProc>${escapeXml(ide.verProc)}</verProc>
</ide>
<emit>
<CNPJ>${emit.CNPJ}</CNPJ>
<xNome>${escapeXml(emit.xNome)}</xNome>
${emit.xFant ? `<xFant>${escapeXml(emit.xFant)}</xFant>` : ''}
<enderEmit>
<xLgr>${escapeXml(emit.enderEmit.xLgr)}</xLgr>
<nro>${escapeXml(emit.enderEmit.nro)}</nro>
${emit.enderEmit.xCpl ? `<xCpl>${escapeXml(emit.enderEmit.xCpl)}</xCpl>` : ''}
<xBairro>${escapeXml(emit.enderEmit.xBairro)}</xBairro>
<cMun>${emit.enderEmit.cMun}</cMun>
<xMun>${escapeXml(emit.enderEmit.xMun)}</xMun>
<UF>${emit.enderEmit.UF}</UF>
<CEP>${emit.enderEmit.CEP}</CEP>
<cPais>${emit.enderEmit.cPais}</cPais>
<xPais>${escapeXml(emit.enderEmit.xPais)}</xPais>
${emit.enderEmit.fone ? `<fone>${emit.enderEmit.fone}</fone>` : ''}
</enderEmit>
<IE>${emit.IE}</IE>
${emit.IM ? `<IM>${emit.IM}</IM>` : ''}
${emit.CNAE ? `<CNAE>${emit.CNAE}</CNAE>` : ''}
<CRT>${emit.CRT}</CRT>
</emit>
<dest>
${dest.CNPJ ? `<CNPJ>${dest.CNPJ}</CNPJ>` : `<CPF>${dest.CPF}</CPF>`}
<xNome>${escapeXml(dest.xNome)}</xNome>
    ${dest.enderDest ? `<enderDest>
<xLgr>${escapeXml(dest.enderDest.xLgr)}</xLgr>
<nro>${escapeXml(dest.enderDest.nro)}</nro>
${dest.enderDest.xCpl ? `<xCpl>${escapeXml(dest.enderDest.xCpl)}</xCpl>` : ''}
<xBairro>${escapeXml(dest.enderDest.xBairro)}</xBairro>
<cMun>${dest.enderDest.cMun}</cMun>
<xMun>${escapeXml(dest.enderDest.xMun)}</xMun>
<UF>${dest.enderDest.UF}</UF>
<CEP>${dest.enderDest.CEP}</CEP>
<cPais>${dest.enderDest.cPais}</cPais>
<xPais>${escapeXml(dest.enderDest.xPais)}</xPais>
${dest.enderDest.fone ? `<fone>${dest.enderDest.fone}</fone>` : ''}
</enderDest>` : ''}
<indIEDest>${dest.indIEDest}</indIEDest>
${dest.IE ? `<IE>${dest.IE}</IE>` : ''}
${dest.email ? `<email>${escapeXml(dest.email)}</email>` : ''}
</dest>
${det.map(item => buildDetXml(item)).join('\n')}
<total>
<ICMSTot>
<vBC>${total.ICMSTot.vBC}</vBC>
<vICMS>${total.ICMSTot.vICMS}</vICMS>
<vICMSDeson>${total.ICMSTot.vICMSDeson}</vICMSDeson>
<vFCP>${total.ICMSTot.vFCP}</vFCP>
<vBCST>${total.ICMSTot.vBCST}</vBCST>
<vST>${total.ICMSTot.vST}</vST>
<vFCPST>${total.ICMSTot.vFCPST}</vFCPST>
<vFCPSTRet>${total.ICMSTot.vFCPSTRet}</vFCPSTRet>
<vProd>${total.ICMSTot.vProd}</vProd>
<vFrete>${total.ICMSTot.vFrete}</vFrete>
<vSeg>${total.ICMSTot.vSeg}</vSeg>
<vDesc>${total.ICMSTot.vDesc}</vDesc>
<vII>${total.ICMSTot.vII}</vII>
<vIPI>${total.ICMSTot.vIPI}</vIPI>
<vIPIDevol>${total.ICMSTot.vIPIDevol}</vIPIDevol>
<vPIS>${total.ICMSTot.vPIS}</vPIS>
<vCOFINS>${total.ICMSTot.vCOFINS}</vCOFINS>
<vOutro>${total.ICMSTot.vOutro}</vOutro>
<vNF>${total.ICMSTot.vNF}</vNF>
${total.ICMSTot.vTotTrib ? `<vTotTrib>${total.ICMSTot.vTotTrib}</vTotTrib>` : ''}
</ICMSTot>
</total>
<transp>
<modFrete>${transp.modFrete}</modFrete>
</transp>
<pag>
${pag.detPag.map(p => `<detPag>
${p.indPag ? `<indPag>${p.indPag}</indPag>` : ''}
<tPag>${p.tPag}</tPag>
<vPag>${p.vPag}</vPag>
</detPag>`).join('\n')}
</pag>
${infAdic?.infCpl ? `<infAdic><infCpl>${escapeXml(infAdic.infCpl)}</infCpl></infAdic>` : ''}
</infNFe>
</NFe>`;

  return xml;
}

function buildDetXml(item: NFeXmlData['det'][0]): string {
  const { nItem, prod, imposto } = item;

  return `<det nItem="${nItem}">
<prod>
<cProd>${escapeXml(prod.cProd)}</cProd>
${prod.cEAN ? `<cEAN>${prod.cEAN}</cEAN>` : '<cEAN>SEM GTIN</cEAN>'}
<xProd>${escapeXml(prod.xProd)}</xProd>
<NCM>${prod.NCM}</NCM>
<CFOP>${prod.CFOP}</CFOP>
<uCom>${escapeXml(prod.uCom)}</uCom>
<qCom>${prod.qCom}</qCom>
<vUnCom>${prod.vUnCom}</vUnCom>
<vProd>${prod.vProd}</vProd>
${prod.cEANTrib ? `<cEANTrib>${prod.cEANTrib}</cEANTrib>` : '<cEANTrib>SEM GTIN</cEANTrib>'}
<uTrib>${escapeXml(prod.uTrib)}</uTrib>
<qTrib>${prod.qTrib}</qTrib>
<vUnTrib>${prod.vUnTrib}</vUnTrib>
${prod.vDesc ? `<vDesc>${prod.vDesc}</vDesc>` : ''}
<indTot>${prod.indTot}</indTot>
</prod>
<imposto>
${imposto.vTotTrib ? `<vTotTrib>${imposto.vTotTrib}</vTotTrib>` : ''}
<ICMS>
${imposto.ICMS.ICMSSN102 ? `<ICMSSN102>
<orig>${imposto.ICMS.ICMSSN102.orig}</orig>
<CSOSN>${imposto.ICMS.ICMSSN102.CSOSN}</CSOSN>
</ICMSSN102>` : ''}
</ICMS>
<PIS>
${imposto.PIS.PISOutr ? `<PISOutr>
<CST>${imposto.PIS.PISOutr.CST}</CST>
${imposto.PIS.PISOutr.vBC ? `<vBC>${imposto.PIS.PISOutr.vBC}</vBC>` : ''}
${imposto.PIS.PISOutr.pPIS ? `<pPIS>${imposto.PIS.PISOutr.pPIS}</pPIS>` : ''}
<vPIS>${imposto.PIS.PISOutr.vPIS}</vPIS>
</PISOutr>` : ''}
</PIS>
<COFINS>
${imposto.COFINS.COFINSOutr ? `<COFINSOutr>
<CST>${imposto.COFINS.COFINSOutr.CST}</CST>
${imposto.COFINS.COFINSOutr.vBC ? `<vBC>${imposto.COFINS.COFINSOutr.vBC}</vBC>` : ''}
${imposto.COFINS.COFINSOutr.pCOFINS ? `<pCOFINS>${imposto.COFINS.COFINSOutr.pCOFINS}</pCOFINS>` : ''}
<vCOFINS>${imposto.COFINS.COFINSOutr.vCOFINS}</vCOFINS>
</COFINSOutr>` : ''}
</COFINS>
</imposto>
</det>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calcula dígito verificador da chave de acesso (módulo 11)
 */
function calculateCheckDigit(key: string): string {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let weightIndex = 0;

  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * weights[weightIndex % 8];
    weightIndex++;
  }

  const remainder = sum % 11;
  const digit = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;

  return digit.toString();
}

/**
 * Gera chave de acesso da NF-e (44 dígitos + DV)
 */
export function generateAccessKey(data: {
  cUF: string; // 2 dígitos
  aamm: string; // AAMM (ano e mês de emissão)
  cnpj: string; // 14 dígitos
  mod: string; // 2 dígitos (55 para NFe)
  serie: string; // 3 dígitos
  nNF: string; // 9 dígitos
  tpEmis: string; // 1 dígito
  cNF: string; // 8 dígitos (código numérico aleatório)
}): string {
  const { cUF, aamm, cnpj, mod, serie, nNF, tpEmis, cNF } = data;

  // Montar chave sem DV (43 dígitos)
  const keyWithoutDV =
    cUF.padStart(2, '0') +
    aamm +
    cnpj.padStart(14, '0') +
    mod.padStart(2, '0') +
    serie.padStart(3, '0') +
    nNF.padStart(9, '0') +
    tpEmis +
    cNF.padStart(8, '0');

  // Calcular e adicionar DV
  const dv = calculateCheckDigit(keyWithoutDV);

  return keyWithoutDV + dv;
}
