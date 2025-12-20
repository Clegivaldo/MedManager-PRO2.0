// @ts-ignore
import PdfPrinter from 'pdfmake';
import { parseStringPromise } from 'xml2js';

import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  },
  Courier: {
    normal: 'Courier',
    bold: 'Courier-Bold',
    italics: 'Courier-Oblique',
    bolditalics: 'Courier-BoldOblique'
  }
};

export class DanfeService {
  private printer: PdfPrinter;

  constructor() {
    this.printer = new PdfPrinter(fonts);
  }

  /**
   * Generates a DANFE PDF buffer from an XML string
   */
  async generatePDF(xml: string): Promise<Buffer> {
    const parsed = await parseStringPromise(xml);
    const nfe = parsed.nfeProc?.NFe?.[0]?.infNFe?.[0];
    const protNFe = parsed.nfeProc?.protNFe?.[0]?.infProt?.[0];

    if (!nfe) {
      throw new Error('Invalid NFe XML structure');
    }

    const model = nfe.ide[0].mod[0];
    if (model === '65') {
      return this.generateNFCePDF(nfe, protNFe, parsed);
    }

    // Extract data
    const emit = nfe.emit[0];
    const dest = nfe.dest[0];
    const ide = nfe.ide[0];
    const det = nfe.det;
    const total = nfe.total[0].ICMSTot[0];
    const infAdic = nfe.infAdic?.[0];

    // Barcode & QR Code
    const accessKey = protNFe?.chNFe?.[0] || ide.cNF?.[0] || '00000000000000000000000000000000000000000000';
    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: accessKey,
      scale: 3,
      height: 10,
      includetext: false,
      textxalign: 'center',
    });

    // Generate simple QR Code (URL)
    const qrCodeUrl = `https://nfe.fazenda.sp.gov.br/qrcode/${accessKey}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // Environment & Status check
    const tpAmb = ide.tpAmb[0]; // 1=Produção, 2=Homologação
    const isHomologation = tpAmb === '2';
    const isAuthorized = !!protNFe?.nProt?.[0];

    // Build PDF Definition
    const docDefinition: any = {
      defaultStyle: { font: 'Helvetica', fontSize: 7 },
      pageMargins: [20, 20, 20, 20],
      watermark: (isHomologation || !isAuthorized) ? {
        text: isHomologation ? 'HOMOLOGAÇÃO - SEM VALOR FISCAL' : 'SEM VALOR FISCAL',
        color: 'gray',
        opacity: 0.3,
        bold: true,
        italics: false,
        angle: 45,
        fontSize: 60
      } : undefined,
      content: [
        // Header (Issuer Info & DANFE Label)
        {
          columns: [
            {
              width: 'auto',
              stack: [
                { text: emit.xNome[0].toUpperCase(), fontSize: 10, bold: true },
                { text: `${emit.enderEmit[0].xLgr[0]}, ${emit.enderEmit[0].nro[0]}`, fontSize: 7 },
                { text: `${emit.enderEmit[0].xBairro[0]} - ${emit.enderEmit[0].xMun[0]} / ${emit.enderEmit[0].UF[0]}`, fontSize: 7 },
                { text: `Telefone: ${emit.enderEmit[0].fone?.[0] || '-'}`, fontSize: 7 }
              ]
            },
            {
              width: '*',
              alignment: 'center',
              stack: [
                { text: 'DANFE', fontSize: 14, bold: true },
                { text: 'Documento Auxiliar da Nota Fiscal Eletrônica', fontSize: 8 },
                { text: `0 - Entrada / 1 - Saída\n${ide.tpNF[0]}`, fontSize: 8, bold: true, margin: [0, 5, 0, 5] },
                { text: `Nº ${ide.nNF[0]}`, fontSize: 10, bold: true },
                { text: `SÉRIE ${ide.serie[0]}`, fontSize: 10, bold: true }
              ]
            },
            {
              width: 150,
              image: `data:image/png;base64,${barcodeBuffer.toString('base64')}`,
              fit: [150, 40]
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 550, y2: 5, lineWidth: 1 }] },

        // Key & Protocol
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'CHAVE DE ACESSO\n', color: 'gray', fontSize: 5 },
                { text: accessKey.replace(/(\d{4})/g, '$1 '), fontSize: 9, bold: true }
              ]
            },
            {
              width: 200,
              text: [
                { text: 'PROTOCOLO DE AUTORIZAÇÃO DE USO\n', color: 'gray', fontSize: 5 },
                { text: `${protNFe?.nProt?.[0] || 'EM HOMOLOGAÇÃO'} - ${new Date(protNFe?.dhRecbto?.[0]).toLocaleString('pt-BR')}`, fontSize: 9 }
              ]
            }
          ],
          margin: [0, 5, 0, 5]
        },

        // Natureza Operação & Insc Estaduais
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: 'NATUREZA DA OPERAÇÃO', style: 'tableHeader' },
                { text: 'INSCRIÇÃO ESTADUAL', style: 'tableHeader' },
                { text: 'INSCRIÇÃO ESTADUAL DO SUBST. TRIB.', style: 'tableHeader' }
              ],
              [
                { text: ide.natOp[0], fontSize: 8 },
                { text: emit.IE[0], fontSize: 8 },
                { text: '', fontSize: 8 }
              ]
            ]
          }
        },

        { text: 'DESTINATÁRIO / REMETENTE', style: 'sectionHeader', margin: [0, 10, 0, 2] },
        {
          table: {
            widths: ['50%', '15%', '5%', '20%', '10%'],
            body: [
              [
                { text: 'NOME / RAZÃO SOCIAL', style: 'tableHeader' },
                { text: 'CNPJ / CPF', style: 'tableHeader' },
                { text: 'UF', style: 'tableHeader' },
                { text: 'INSCRIÇÃO ESTADUAL', style: 'tableHeader' },
                { text: 'DATA EMISSÃO', style: 'tableHeader' }
              ],
              [
                { text: dest.xNome[0].substring(0, 45), fontSize: 8 },
                { text: dest.CNPJ?.[0] || dest.CPF?.[0], fontSize: 8 },
                { text: dest.enderDest[0].UF[0], fontSize: 8 },
                { text: dest.IE?.[0] || 'ISENTO', fontSize: 8 },
                { text: new Date(ide.dhEmi[0]).toLocaleDateString('pt-BR'), fontSize: 8 }
              ],
              [
                { text: 'ENDEREÇO', style: 'tableHeader', colSpan: 2 },
                {},
                { text: 'BAIRRO / DISTRITO', style: 'tableHeader', colSpan: 2 },
                {},
                { text: 'DATA SAÍDA', style: 'tableHeader' }
              ],
              [
                { text: `${dest.enderDest[0].xLgr[0]}, ${dest.enderDest[0].nro?.[0]}`, fontSize: 8, colSpan: 2 },
                {},
                { text: dest.enderDest[0].xBairro[0], fontSize: 8, colSpan: 2 },
                {},
                { text: new Date(ide.dhEmi[0]).toLocaleDateString('pt-BR'), fontSize: 8 } // Assuming same for simplicity
              ]
            ]
          }
        },

        { text: 'CÁLCULO DO IMPOSTO', style: 'sectionHeader', margin: [0, 10, 0, 2] },
        {
          table: {
            widths: ['*', '*', '*', '*', '*', '*', '*'],
            body: [
              [
                { text: 'BASE CÁLC. ICMS', style: 'tableHeader' },
                { text: 'VALOR ICMS', style: 'tableHeader' },
                { text: 'BASE CÁLC. ICMS ST', style: 'tableHeader' },
                { text: 'VALOR ICMS ST', style: 'tableHeader' },
                { text: 'VALOR PRODUTOS', style: 'tableHeader' },
                { text: 'VALOR FRETE', style: 'tableHeader' },
                { text: 'VALOR SEGURO', style: 'tableHeader' }
              ],
              [
                total.vBC[0], total.vICMS[0], total.vBCST[0], total.vST[0],
                total.vProd[0], total.vFrete[0], total.vSeg[0]
              ],
              [
                { text: 'DESCONTO', style: 'tableHeader' },
                { text: 'OUTRAS DESP.', style: 'tableHeader' },
                { text: 'VALOR IPI', style: 'tableHeader' },
                { text: 'VALOR TOTAL NOTA', style: 'tableHeader', colSpan: 4, bold: true, fontSize: 10 },
                {}, {}, {}
              ],
              [
                total.vDesc[0], total.vOutro[0], total.vIPI[0],
                { text: total.vNF[0], colSpan: 4, bold: true, fontSize: 10, alignment: 'right' },
                {}, {}, {}
              ]
            ]
          }
        },

        { text: 'DADOS DO PRODUTO / SERVIÇO', style: 'sectionHeader', margin: [0, 10, 0, 2] },
        {
          table: {
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
            headerRows: 1,
            body: [
              [
                { text: 'CÓD', style: 'tableHeader' },
                { text: 'DESCRIÇÃO', style: 'tableHeader' },
                { text: 'NCM', style: 'tableHeader' },
                { text: 'CST', style: 'tableHeader' },
                { text: 'CFOP', style: 'tableHeader' },
                { text: 'UN', style: 'tableHeader' },
                { text: 'QTD', style: 'tableHeader' },
                { text: 'V. UNT', style: 'tableHeader' },
                { text: 'V. TOTAL', style: 'tableHeader' }
              ],
              ...det.map((item: any) => [
                { text: item.prod[0].cProd[0], fontSize: 7 },
                { text: item.prod[0].xProd[0], fontSize: 7 },
                { text: item.prod[0].NCM[0], fontSize: 7 },
                { text: item.imposto[0]?.ICMS[0]?.ICMSSN102?.[0]?.CSOSN?.[0] || '00', fontSize: 7 },
                { text: item.prod[0].CFOP[0], fontSize: 7 },
                { text: item.prod[0].uCom[0], fontSize: 7 },
                { text: item.prod[0].qCom[0], fontSize: 7 },
                { text: item.prod[0].vUnCom[0], fontSize: 7 },
                { text: item.prod[0].vProd[0], fontSize: 7 }
              ])
            ]
          }
        },

        { text: 'DADOS ADICIONAIS', style: 'sectionHeader', margin: [0, 10, 0, 2] },
        {
          text: [
            { text: 'INFORMAÇÕES COMPLEMENTARES\n', style: 'tableHeader' },
            infAdic?.infCpl?.[0] || 'Sem observações adicionais.'
          ],
          fontSize: 7,
          border: [true, true, true, true]
        },

        // QR Code footer
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 80,
              image: qrCodeDataUrl,
              margin: [0, 10, 0, 0]
            }
          ]
        },

        {
          text: 'Desenvolvido por MedManager PRO',
          alignment: 'center',
          fontSize: 6,
          color: 'gray',
          margin: [0, 20, 0, 0]
        }
      ],
      styles: {
        tableHeader: {
          fontSize: 6,
          color: 'black',
          bold: true
        },
        sectionHeader: {
          fontSize: 9,
          bold: true,
          color: 'black'
        }
      }
    };

    return new Promise((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    });
  }
  /**
   * Generates a DANFE NFC-e (Model 65) PDF buffer
   */
  private async generateNFCePDF(nfe: any, protNFe: any, parsed: any): Promise<Buffer> {
    const emit = nfe.emit[0];
    const dest = nfe.dest?.[0];
    const ide = nfe.ide[0];
    const det = nfe.det;
    const total = nfe.total[0].ICMSTot[0];
    const infNFeSupl = parsed.nfeProc?.infNFeSupl?.[0];

    const accessKey = protNFe?.chNFe?.[0] || ide.cNF?.[0] || '00000000000000000000000000000000000000000000';
    const qrCodeUrl = infNFeSupl?.qrCode?.[0] || `https://nfe.fazenda.sp.gov.br/qrcode?p=${accessKey}|2|${ide.tpAmb[0]}|1`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    const tpAmb = ide.tpAmb[0];
    const isHomologation = tpAmb === '2';
    const isAuthorized = !!protNFe?.nProt?.[0];

    const docDefinition: any = {
      pageSize: { width: 226, height: 'auto' }, // 80mm approx
      pageMargins: [10, 10, 10, 10],
      defaultStyle: { font: 'Helvetica', fontSize: 7 },
      watermark: (isHomologation || !isAuthorized) ? {
        text: isHomologation ? 'HOMOLOGAÇÃO' : 'SEM VALOR FISCAL',
        color: 'gray', opacity: 0.2, fontSize: 30, angle: 45
      } : undefined,
      content: [
        // Header
        { text: emit.xNome[0].toUpperCase(), fontSize: 9, bold: true, alignment: 'center' },
        { text: `CNPJ: ${emit.CNPJ[0]}`, alignment: 'center' },
        { text: `${emit.enderEmit[0].xLgr[0]}, ${emit.enderEmit[0].nro[0]}`, alignment: 'center' },
        { text: `${emit.enderEmit[0].xBairro[0]} - ${emit.enderEmit[0].xMun[0]}/${emit.enderEmit[0].UF[0]}`, alignment: 'center' },
        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },
        { text: 'DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica', bold: true, alignment: 'center', fontSize: 8 },
        { text: 'Não permite aproveitamento de crédito de ICMS', fontSize: 6, alignment: 'center' },
        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },

        // Items Table
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'ITEM CÓD DESC', bold: true },
                { text: 'QTD', bold: true },
                { text: 'UN', bold: true },
                { text: 'TOTAL', bold: true, alignment: 'right' }
              ],
              ...det.map((item: any, index: number) => [
                { text: `${index + 1} ${item.prod[0].cProd[0]} ${item.prod[0].xProd[0]}`, fontSize: 6 },
                { text: Number(item.prod[0].qCom[0]).toFixed(0), fontSize: 6 },
                { text: item.prod[0].uCom[0], fontSize: 6 },
                { text: Number(item.prod[0].vProd[0]).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), fontSize: 6, alignment: 'right' }
              ])
            ]
          },
          layout: 'noBorders'
        },
        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },

        // Totals
        {
          columns: [
            { text: 'Qtd. total de itens:', bold: true },
            { text: det.length.toString(), alignment: 'right' }
          ]
        },
        {
          columns: [
            { text: 'Valor total R$:', bold: true, fontSize: 9 },
            { text: Number(total.vNF[0]).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), alignment: 'right', fontSize: 9, bold: true }
          ]
        },
        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },

        // Payment
        { text: 'FORMA DE PAGAMENTO', bold: true },
        {
          columns: [
            { text: 'Dinheiro' }, // Simplified
            { text: Number(total.vNF[0]).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), alignment: 'right' }
          ]
        },
        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },

        // Info & QR Code
        { text: 'Consulte pela Chave de Acesso em:', alignment: 'center', fontSize: 6 },
        { text: 'http://www.nfce.fazenda.sp.gov.br/consulta', alignment: 'center', color: 'blue', fontSize: 6 },
        { text: accessKey.replace(/(\d{4})/g, '$1 '), alignment: 'center', fontSize: 7, bold: true, margin: [0, 5, 0, 5] },

        dest ? { text: `CONSUMIDOR: ${dest.xNome?.[0] || 'NÃO IDENTIFICADO'} - ${dest.CNPJ?.[0] || dest.CPF?.[0] || ''}`, alignment: 'center', fontSize: 7 } : { text: 'CONSUMIDOR NÃO IDENTIFICADO', alignment: 'center', fontSize: 7 },

        { text: '-'.repeat(45), margin: [0, 5, 0, 5] },
        { text: `NFC-e nº ${ide.nNF[0]} Série ${ide.serie[0]} ${new Date(ide.dhEmi[0]).toLocaleString('pt-BR')}`, alignment: 'center', fontSize: 7 },
        { text: `Protocolo: ${protNFe?.nProt?.[0] || 'PENDENTE'}`, alignment: 'center', fontSize: 7 },

        {
          image: qrCodeDataUrl,
          width: 100,
          alignment: 'center',
          margin: [0, 10, 0, 10]
        }
      ]
    };

    const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}

export const danfeService = new DanfeService();
