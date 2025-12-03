import axios from 'axios';
import { create } from 'xmlbuilder2';
import { parseStringPromise } from 'xml2js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import forge from 'node-forge';

/**
 * URLs dos WebServices da Sefaz para NFe 4.00
 * Referência: http://www.nfe.fazenda.gov.br/portal/webServices.aspx
 */
const SEFAZ_ENDPOINTS = {
  // Ambiente de Produção
  production: {
    // Autorização (lote de NF-e)
    SP: {
      NFeAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      NFeRetAutorizacao: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      NFeConsultaProtocolo: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      NFeStatusServico: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
      NFeInutilizacao: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
      NFeConsultaCadastro: 'https://nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx'
    },
    // Outros estados podem ser adicionados aqui
  },
  // Ambiente de Homologação
  homologation: {
    SP: {
      NFeAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      NFeRetAutorizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      NFeConsultaProtocolo: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      NFeStatusServico: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
      NFeInutilizacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
      NFeConsultaCadastro: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx'
    }
  }
};

export interface SefazConfig {
  environment: 'production' | 'homologation';
  state: string;
  certificatePath?: string;
  certificatePassword?: string;
  certificateContent?: string; // Base64 do certificado
}

export interface NFeAutorizacaoResponse {
  status: 'success' | 'error' | 'processing';
  statusCode: string;
  statusMessage: string;
  recibo?: string;
  protocol?: string;
  xml?: string;
  errors?: string[];
}

export interface NFeConsultaResponse {
  status: 'authorized' | 'denied' | 'cancelled' | 'processing' | 'error';
  statusCode: string;
  statusMessage: string;
  protocol?: string;
  authorizationDate?: Date;
  xml?: string;
}

export class SefazService {
  private config: SefazConfig;
  private certificate?: forge.pki.Certificate;
  private privateKey?: forge.pki.PrivateKey;

  constructor(config: SefazConfig) {
    this.config = config;
  }

  /**
   * Carrega o certificado digital para autenticação HTTPS mútua
   */
  async loadCertificate(): Promise<void> {
    try {
      let pfxContent: Buffer;

      if (this.config.certificateContent) {
        // Certificado em base64
        pfxContent = Buffer.from(this.config.certificateContent, 'base64');
      } else if (this.config.certificatePath) {
        // Certificado de arquivo
        pfxContent = await fs.readFile(this.config.certificatePath);
      } else {
        throw new Error('Certificate not provided');
      }

      // Decodificar PFX/PKCS12
      const p12Asn1 = forge.asn1.fromDer(pfxContent.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        p12Asn1,
        this.config.certificatePassword || ''
      );

      // Extrair certificado e chave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag]?.[0];
      
      if (certBag && certBag.cert) {
        this.certificate = certBag.cert;
      }

      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      
      if (keyBag && keyBag.key) {
        this.privateKey = keyBag.key as forge.pki.PrivateKey;
      }

      if (!this.certificate || !this.privateKey) {
        throw new Error('Failed to extract certificate or private key from PFX');
      }

      logger.info('Certificate loaded successfully');
    } catch (error) {
      logger.error('Error loading certificate:', error);
      throw error;
    }
  }

  /**
   * Obtem a URL do WebService baseado no estado e ambiente
   */
  private getEndpoint(service: string): string {
    const env = this.config.environment;
    const state = this.config.state;
    
    const endpoints = SEFAZ_ENDPOINTS[env][state as keyof typeof SEFAZ_ENDPOINTS.production];
    
    if (!endpoints) {
      throw new Error(`WebService not configured for state ${state} in ${env} environment`);
    }

    return endpoints[service as keyof typeof endpoints];
  }

  /**
   * Envia requisição SOAP para a Sefaz
   */
  private async sendSoapRequest(
    service: string,
    method: string,
    soapBody: string
  ): Promise<string> {
    const endpoint = this.getEndpoint(service);
    
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${service}">
      ${soapBody}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    try {
      // Configurar HTTPS com certificado digital (se disponível)
      const httpsAgent = this.certificate && this.privateKey ? {
        cert: forge.pki.certificateToPem(this.certificate),
        key: forge.pki.privateKeyToPem(this.privateKey),
        rejectUnauthorized: this.config.environment === 'production'
      } : undefined;

      const response = await axios.post(endpoint, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'SOAPAction': `http://www.portalfiscal.inf.br/nfe/wsdl/${service}/${method}`
        },
        httpsAgent: httpsAgent as any,
        timeout: 60000 // 60 segundos
      });

      return response.data;
    } catch (error: any) {
      logger.error(`Sefaz SOAP error (${service}):`, error.message);
      if (error.response) {
        logger.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Consulta o status do serviço da Sefaz
   */
  async consultarStatusServico(): Promise<{
    status: string;
    message: string;
    responseTime: number;
  }> {
    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';
    const cUF = '35'; // São Paulo (pode ser parametrizado)

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('consStatServ', { 
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('tpAmb').txt(tpAmb).up()
      .ele('cUF').txt(cUF).up()
      .ele('xServ').txt('STATUS').up()
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeStatusServico',
        'nfeStatusServicoNF',
        xml
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeStatusServicoNFResult[0].retConsStatServ[0];
      
      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      return {
        status: cStat === '107' ? 'online' : 'offline',
        message: xMotivo,
        responseTime: parseInt(result.dhRecbto?.[0] || '0')
      };
    } catch (error) {
      logger.error('Error checking Sefaz status:', error);
      throw error;
    }
  }

  /**
   * Envia lote de NF-e para autorização
   */
  async autorizarNFe(nfeXml: string, idLote: string): Promise<NFeAutorizacaoResponse> {
    const versaoDados = '4.00';
    const indSinc = '1'; // Síncrono

    // Montar envelope do lote
    const enviNFe = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('enviNFe', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('idLote').txt(idLote).up()
      .ele('indSinc').txt(indSinc).up()
      .import(create(nfeXml).first())
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeAutorizacao',
        'nfeAutorizacaoLote',
        enviNFe
      );

      const parsed = await parseStringPromise(soapResponse);
      const body = parsed['soap:Envelope']['soap:Body'][0];
      const result = body.nfeResultMsg?.[0]?.retEnviNFe?.[0] || body.nfeAutorizacaoLoteResult?.[0]?.retEnviNFe?.[0];

      if (!result) {
        throw new Error('Invalid SOAP response structure');
      }

      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      // Status 100 = Autorizado
      // Status 103 = Lote recebido com sucesso (processamento assíncrono)
      // Status 104 = Lote processado
      if (cStat === '100' || cStat === '104') {
        const protNFe = result.protNFe?.[0];
        const infProt = protNFe?.infProt?.[0];
        
        return {
          status: 'success',
          statusCode: cStat,
          statusMessage: xMotivo,
          protocol: infProt?.nProt?.[0],
          xml: protNFe ? create(protNFe).end({ prettyPrint: false }) : undefined
        };
      } else if (cStat === '103') {
        // Lote em processamento
        return {
          status: 'processing',
          statusCode: cStat,
          statusMessage: xMotivo,
          recibo: result.infRec?.[0]?.nRec?.[0]
        };
      } else {
        // Erro na autorização
        const errors = result.protNFe?.map((prot: any) => {
          const infProt = prot.infProt[0];
          return `${infProt.cStat[0]} - ${infProt.xMotivo[0]}`;
        }) || [xMotivo];

        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo,
          errors
        };
      }
    } catch (error) {
      logger.error('Error authorizing NF-e:', error);
      throw error;
    }
  }

  /**
   * Consulta o resultado do processamento de um lote
   */
  async consultarRecibo(recibo: string): Promise<NFeAutorizacaoResponse> {
    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('consReciNFe', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('tpAmb').txt(tpAmb).up()
      .ele('nRec').txt(recibo).up()
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeRetAutorizacao',
        'nfeRetAutorizacaoLote',
        xml
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeRetAutorizacaoLoteResult[0].retConsReciNFe[0];

      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      if (cStat === '104') {
        // Lote processado
        const protNFe = result.protNFe?.[0];
        const infProt = protNFe?.infProt?.[0];
        const protStat = infProt?.cStat?.[0];

        if (protStat === '100') {
          // NF-e autorizada
          return {
            status: 'success',
            statusCode: protStat,
            statusMessage: infProt.xMotivo[0],
            protocol: infProt.nProt[0],
            xml: create(protNFe).end({ prettyPrint: false })
          };
        } else {
          // NF-e rejeitada
          return {
            status: 'error',
            statusCode: protStat,
            statusMessage: infProt.xMotivo[0],
            errors: [infProt.xMotivo[0]]
          };
        }
      } else if (cStat === '105') {
        // Lote ainda em processamento
        return {
          status: 'processing',
          statusCode: cStat,
          statusMessage: xMotivo,
          recibo
        };
      } else {
        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo,
          errors: [xMotivo]
        };
      }
    } catch (error) {
      logger.error('Error consulting receipt:', error);
      throw error;
    }
  }

  /**
   * Consulta protocolo de uma NF-e pela chave de acesso
   */
  async consultarProtocolo(chaveAcesso: string): Promise<NFeConsultaResponse> {
    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('consSitNFe', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('tpAmb').txt(tpAmb).up()
      .ele('xServ').txt('CONSULTAR').up()
      .ele('chNFe').txt(chaveAcesso).up()
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeConsultaProtocolo',
        'nfeConsultaNF',
        xml
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeConsultaNFResult[0].retConsSitNFe[0];

      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      if (cStat === '100') {
        // NF-e autorizada
        const protNFe = result.protNFe[0];
        const infProt = protNFe.infProt[0];

        return {
          status: 'authorized',
          statusCode: cStat,
          statusMessage: xMotivo,
          protocol: infProt.nProt[0],
          authorizationDate: new Date(infProt.dhRecbto[0]),
          xml: create(protNFe).end({ prettyPrint: false })
        };
      } else if (cStat === '101' || cStat === '110' || cStat === '301') {
        // NF-e cancelada
        return {
          status: 'cancelled',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      } else if (cStat === '110' || cStat === '205') {
        // NF-e denegada
        return {
          status: 'denied',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      } else {
        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      }
    } catch (error) {
      logger.error('Error consulting protocol:', error);
      throw error;
    }
  }

  /**
   * Cancela uma NF-e autorizada
   */
  async cancelarNFe(
    chaveAcesso: string,
    protocolo: string,
    justificativa: string,
    cnpj: string
  ): Promise<{
    status: 'success' | 'error';
    statusCode: string;
    statusMessage: string;
    protocol?: string;
  }> {
    if (justificativa.length < 15) {
      throw new Error('Justification must have at least 15 characters');
    }

    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';
    const dhEvento = new Date().toISOString();
    const nSeqEvento = '1'; // Sempre 1 para cancelamento

    const evento = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('evento', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('infEvento', { Id: `ID110111${chaveAcesso}01` })
        .ele('cOrgao').txt('35').up() // São Paulo
        .ele('tpAmb').txt(tpAmb).up()
        .ele('CNPJ').txt(cnpj).up()
        .ele('chNFe').txt(chaveAcesso).up()
        .ele('dhEvento').txt(dhEvento).up()
        .ele('tpEvento').txt('110111').up() // Cancelamento
        .ele('nSeqEvento').txt(nSeqEvento).up()
        .ele('verEvento').txt('1.00').up()
        .ele('detEvento', { versao: '1.00' })
          .ele('descEvento').txt('Cancelamento').up()
          .ele('nProt').txt(protocolo).up()
          .ele('xJust').txt(justificativa).up()
        .up()
      .up()
      .end({ prettyPrint: false });

    // Aqui deveria assinar o XML do evento antes de enviar
    // Por simplicidade, vamos enviar sem assinatura (só funciona em homologação)

    const envEvento = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('envEvento', {
        versao: '1.00',
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('idLote').txt(Date.now().toString()).up()
      .import(create(evento).first())
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeRecepcaoEvento',
        'nfeRecepcaoEvento',
        envEvento
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeRecepcaoEventoResult[0].retEnvEvento[0];

      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      if (cStat === '128') {
        // Lote de evento processado
        const retEvento = result.retEvento[0];
        const infEvento = retEvento.infEvento[0];
        const eventStat = infEvento.cStat[0];

        if (eventStat === '135') {
          // Cancelamento homologado
          return {
            status: 'success',
            statusCode: eventStat,
            statusMessage: infEvento.xMotivo[0],
            protocol: infEvento.nProt?.[0]
          };
        } else {
          return {
            status: 'error',
            statusCode: eventStat,
            statusMessage: infEvento.xMotivo[0]
          };
        }
      } else {
        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      }
    } catch (error) {
      logger.error('Error cancelling NF-e:', error);
      throw error;
    }
  }

  /**
   * Envia Carta de Correção Eletrônica (CC-e) - Evento 110110
   */
  async enviarCartaCorrecao(
    chaveAcesso: string,
    cnpj: string,
    textoCorrecao: string
  ): Promise<{
    status: 'success' | 'error';
    statusCode: string;
    statusMessage: string;
    protocol?: string;
  }> {
    if (!textoCorrecao || textoCorrecao.length < 15) {
      throw new Error('Correction text must have at least 15 characters');
    }

    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';
    const dhEvento = new Date().toISOString();
    const nSeqEvento = '1';

    const evento = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('evento', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('infEvento', { Id: `ID110110${chaveAcesso}01` })
        .ele('cOrgao').txt('35').up() // Ajustar por UF; SP=35
        .ele('tpAmb').txt(tpAmb).up()
        .ele('CNPJ').txt(cnpj).up()
        .ele('chNFe').txt(chaveAcesso).up()
        .ele('dhEvento').txt(dhEvento).up()
        .ele('tpEvento').txt('110110').up() // CC-e
        .ele('nSeqEvento').txt(nSeqEvento).up()
        .ele('verEvento').txt('1.00').up()
        .ele('detEvento', { versao: '1.00' })
          .ele('descEvento').txt('Carta de Correcao').up()
          .ele('xCorrecao').txt(textoCorrecao).up()
          .ele('xCondUso').txt('A Carta de Correção é disciplinada pelo art. 7o, § 1o do Convenio S/N, de 15 de dezembro de 1970 e pelo Ajuste SINIEF 01/2007').up()
        .up()
      .up()
      .end({ prettyPrint: false });

    const envEvento = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('envEvento', {
        versao: '1.00',
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('idLote').txt(Date.now().toString()).up()
      .import(create(evento).first())
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeRecepcaoEvento',
        'nfeRecepcaoEvento',
        envEvento
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeRecepcaoEventoResult[0].retEnvEvento[0];

      const cStat = result.cStat[0];
      const xMotivo = result.xMotivo[0];

      if (cStat === '128') {
        const retEvento = result.retEvento[0];
        const infEvento = retEvento.infEvento[0];
        const eventStat = infEvento.cStat[0];

        if (eventStat === '135' || eventStat === '136') {
          return {
            status: 'success',
            statusCode: eventStat,
            statusMessage: infEvento.xMotivo[0],
            protocol: infEvento.nProt?.[0]
          };
        } else {
          return {
            status: 'error',
            statusCode: eventStat,
            statusMessage: infEvento.xMotivo[0]
          };
        }
      } else {
        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      }
    } catch (error) {
      logger.error('Error sending CC-e:', error);
      throw error;
    }
  }

  /**
   * Inutiliza uma numeração de NF-e
   */
  async inutilizarNumeracao(
    ano: string,
    cnpj: string,
    serie: string,
    numeroInicial: string,
    numeroFinal: string,
    justificativa: string
  ): Promise<{
    status: 'success' | 'error';
    statusCode: string;
    statusMessage: string;
    protocol?: string;
  }> {
    if (justificativa.length < 15) {
      throw new Error('Justification must have at least 15 characters');
    }

    const versaoDados = '4.00';
    const tpAmb = this.config.environment === 'production' ? '1' : '2';
    const cUF = '35'; // São Paulo
    const mod = '55'; // Modelo 55 (NF-e)

    const id = `ID${cUF}${ano}${cnpj}${mod}${serie.padStart(3, '0')}${numeroInicial.padStart(9, '0')}${numeroFinal.padStart(9, '0')}`;

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('inutNFe', {
        versao: versaoDados,
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
      .ele('infInut', { Id: id })
        .ele('tpAmb').txt(tpAmb).up()
        .ele('xServ').txt('INUTILIZAR').up()
        .ele('cUF').txt(cUF).up()
        .ele('ano').txt(ano).up()
        .ele('CNPJ').txt(cnpj).up()
        .ele('mod').txt(mod).up()
        .ele('serie').txt(serie).up()
        .ele('nNFIni').txt(numeroInicial).up()
        .ele('nNFFin').txt(numeroFinal).up()
        .ele('xJust').txt(justificativa).up()
      .up()
      .end({ prettyPrint: false });

    try {
      const soapResponse = await this.sendSoapRequest(
        'NFeInutilizacao',
        'nfeInutilizacaoNF',
        xml
      );

      const parsed = await parseStringPromise(soapResponse);
      const result = parsed['soap:Envelope']['soap:Body'][0].nfeInutilizacaoNFResult[0].retInutNFe[0];

      const cStat = result.infInut[0].cStat[0];
      const xMotivo = result.infInut[0].xMotivo[0];

      if (cStat === '102') {
        // Inutilização homologada
        return {
          status: 'success',
          statusCode: cStat,
          statusMessage: xMotivo,
          protocol: result.infInut[0].nProt?.[0]
        };
      } else {
        return {
          status: 'error',
          statusCode: cStat,
          statusMessage: xMotivo
        };
      }
    } catch (error) {
      logger.error('Error disabling numbering:', error);
      throw error;
    }
  }
}
