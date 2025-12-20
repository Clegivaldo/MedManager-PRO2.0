import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { prismaMaster } from '../lib/prisma.js';
import { withTenantPrisma } from '../lib/tenant-prisma.js';
import { validateCertificate } from '../utils/xmlSigner.js';
import { buildNFeXml, generateAccessKey, type NFeXmlData } from '../utils/nfeXmlBuilder.js';
import { decryptCertificate } from '../utils/certificate.js';
import { SefazService, type SefazConfig } from './sefaz.service.js';
import { normalizeNFeStatus } from '../utils/nfeStatusCodes.js';
import pkg from '@prisma/client';
const InvoiceStatus = (pkg as any).InvoiceStatus as any;
import * as fs from 'fs/promises';
import { signXml } from '../utils/xmlSigner.js'; // Ensure this is exported from xmlSigner
import crypto from 'crypto';

// Reusing interfaces from NFeService where possible or defining new ones
export interface NFeInvoiceData {
    invoice: {
        id: string;
        invoiceNumber: string;
        operationType: string;
        cfop: string;
        naturezaOperacao: string;
        paymentMethod: string;
        installments: number;
        observations?: string;
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
        createdAt: Date;
    };
    issuer: {
        cnpj: string;
        name: string;
        stateRegistration: string;
        municipalRegistration?: string;
        address: string;
        phone?: string;
        email?: string;
    };
    customer?: { // Optional for NFC-e
        id?: string;
        name?: string;
        cnpjCpf?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    items: Array<{
        id: string;
        product: {
            id: string;
            name: string;
            ncm: string;
            unit: string;
            gtin?: string;
            cfop: string;
        };
        quantity: number;
        unitPrice: number;
        discount: number;
        subtotal: number;
        total: number;
        icms: number;
    }>;
    payments?: Array<{
        method: string;
        amount: number;
        status: string;
    }>;
}

export interface SefazResponse {
    success: boolean;
    accessKey?: string;
    protocolNumber?: string;
    authorizationDate?: Date;
    status: string;
    statusCode?: string;
    statusMessage?: string;
    xmlContent?: string;
    xml?: string;
    danfeUrl?: string; // Link to public consultation
    qrCodeUrl?: string;
    sefazResponse?: any;
    errorDetails?: string;
}

export class NFCeService {
    private readonly sefazEndpoint: string;
    private readonly certificatePath: string;
    private readonly certificatePassword: string;

    constructor() {
        this.sefazEndpoint = config.SEFAZ_NFE_ENDPOINT || 'https://nfe.fazenda.sp.gov.br';
        this.certificatePath = config.SEFAZ_CERT_PATH || '';
        this.certificatePassword = config.SEFAZ_CERT_PASSWORD || '';
    }

    private mapInvoiceStatus(norm?: string | null): any | undefined {
        if (!norm) return undefined;
        const map: Record<string, any> = {
            'authorized': InvoiceStatus.AUTHORIZED,
            'denied': InvoiceStatus.DENIED,
            'cancelled': InvoiceStatus.CANCELLED,
            'error': InvoiceStatus.DENIED as any
        } as any;
        return map[norm] || undefined;
    }

    /**
     * Generates the QR Code URL for NFC-e (Version 2.0)
     * Require CSC (Token ID and Token Value)
     */
    /**
     * Generates the QR Code URL for NFC-e (Version 2.0)
     */
    private generateQRCode(
        accessKey: string,
        tpAmb: string,
        cscId: string | null,
        cscToken: string | null,
        totalValue: string,
        digestValue: string,
        dhEmi: string,
        customerCpfCnpj?: string
    ): string {
        if (!cscId || !cscToken) {
            // Fallback for simulation/incomplete config
            const baseUrl = tpAmb === '1'
                ? 'https://www.nfce.fazenda.sp.gov.br/qrcode'
                : 'https://homologacao.nfce.fazenda.sp.gov.br/qrcode';
            return `${baseUrl}?p=${accessKey}|2|${tpAmb}|${cscId || '1'}`;
        }

        // Format: chNFe|nVersao|tpAmb|cDest|dhEmi|vNF|vICMS|digVal|cIdToken
        // QR Code 2.0 params
        const versao = '2';
        const cDest = customerCpfCnpj ? customerCpfCnpj.replace(/\D/g, '') : '';

        // Convert dates and values to SEFAZ format if needed, but normally they are already correct
        // Hexadecimal representation of DigestValue is needed? No, DigestValue in XML is Base64.
        // SEFAZ requires hex of DigestValue for some states, but for others it's the raw value.
        // Standard says: "Hexadecimal do DigestValue"
        const digValHex = Buffer.from(digestValue, 'base64').toString('hex');

        const params = [
            accessKey,
            versao,
            tpAmb,
            cDest,
            dhEmi,
            totalValue,
            '0.00', // vICMS - using 0.00 if not easily available or assume simplified
            digValHex,
            cscId.padStart(6, '0')
        ].join('|');

        const hash = crypto.createHash('sha1').update(params + cscToken).digest('hex');

        const baseUrl = tpAmb === '1'
            ? 'https://www.nfce.fazenda.sp.gov.br/qrcode'
            : 'https://homologacao.nfce.fazenda.sp.gov.br/qrcode';

        return `${baseUrl}?p=${params}|${hash}`;
    }

    /**
     * Emit NFC-e (Model 65)
     */
    async emitNFCe(nfeData: NFeInvoiceData, tenantId: string): Promise<SefazResponse> {
        try {
            logger.info(`Starting NFC-e emission`, {
                invoiceNumber: nfeData.invoice.invoiceNumber,
                total: nfeData.invoice.total,
                tenantId
            });

            const fiscalProfile = await prismaMaster.tenantFiscalProfile.findUnique({
                where: { tenantId },
                include: { series: true }
            });

            if (!fiscalProfile) {
                throw new AppError('Fiscal profile not configured.', 400);
            }

            const activeSeries = fiscalProfile.series.find(
                (s) => s.invoiceType === 'EXIT' && s.isActive
            );

            if (!activeSeries) {
                throw new AppError('No active fiscal series found.', 400);
            }

            const nextNumber = activeSeries.nextNumber;
            await prismaMaster.fiscalSeries.update({
                where: { id: activeSeries.id },
                data: { nextNumber: nextNumber + 1 }
            });

            // Generate XML
            const nfeXml = await this.generateNFCeXml(nfeData, fiscalProfile, activeSeries.seriesNumber, nextNumber);
            const tpAmb = fiscalProfile.sefazEnvironment === 'producao' ? '1' : '2';

            // Simulation Check
            const useSimulation = (!fiscalProfile.certificatePath || !fiscalProfile.certificatePassword)
                && !!config.ALLOW_NFE_SIMULATION
                && fiscalProfile.sefazEnvironment === 'homologacao'
                && config.isDevelopment;

            let sefazResponse: SefazResponse;

            if (useSimulation) {
                logger.warn('NFC-e emission in SIMULATION MODE');
                const accessKeyMatch = nfeXml.match(/NFe(\d{44})/);
                const accessKey = accessKeyMatch ? accessKeyMatch[1] : 'SIMULATED' + Date.now();
                sefazResponse = {
                    success: true,
                    accessKey,
                    protocolNumber: 'SIM-' + Date.now(),
                    authorizationDate: new Date(),
                    status: 'authorized',
                    statusCode: '100',
                    statusMessage: 'Autorizada (Simulação)',
                    xmlContent: nfeXml,
                    xml: nfeXml,
                    qrCodeUrl: this.generateQRCode(
                        accessKey,
                        tpAmb,
                        fiscalProfile.cscId,
                        fiscalProfile.cscToken,
                        nfeData.invoice.total.toFixed(2),
                        'SIMULATED-DIGEST',
                        nfeData.invoice.createdAt.toISOString(),
                        nfeData.customer?.cnpjCpf
                    ),
                    sefazResponse: { simulation: true }
                };
            } else {
                // Sign and Send
                const signedXml = await this.signXml(nfeXml, fiscalProfile);

                // Extract DigestValue for QR Code
                const digValMatch = signedXml.match(/<DigestValue>(.*)<\/DigestValue>/);
                const digestValue = digValMatch ? digValMatch[1] : '';
                const accessKeyMatch = signedXml.match(/NFe(\d{44})/);
                const accessKey = accessKeyMatch ? accessKeyMatch[1] : '';

                sefazResponse = await this.sendToSefaz(signedXml, nfeData, fiscalProfile);

                if (sefazResponse.success) {
                    sefazResponse.qrCodeUrl = this.generateQRCode(
                        accessKey,
                        tpAmb,
                        fiscalProfile.cscId,
                        fiscalProfile.cscToken,
                        nfeData.invoice.total.toFixed(2),
                        digestValue,
                        nfeData.invoice.createdAt.toISOString(),
                        nfeData.customer?.cnpjCpf
                    );
                }
            }

            // Persist
            try {
                await withTenantPrisma({ id: tenantId } as any, async (prisma) => {
                    await prisma.invoice.update({
                        where: { id: nfeData.invoice.id },
                        data: {
                            invoiceNumber: nextNumber,
                            series: activeSeries.seriesNumber,
                            accessKey: sefazResponse.accessKey,
                            protocol: sefazResponse.protocolNumber,
                            status: this.mapInvoiceStatus(normalizeNFeStatus(sefazResponse.statusCode) || sefazResponse.status) || undefined,
                            xmlContent: sefazResponse.xml || sefazResponse.xmlContent || undefined,
                            authorizationDate: sefazResponse.authorizationDate || undefined,
                            model: '65',
                            // Storing QR Code URL in metadata if needed
                            metadata: {
                                qrCodeUrl: sefazResponse.qrCodeUrl,
                                ...((nfeData.invoice as any).metadata || {})
                            }
                        }
                    });
                });
            } catch (e) {
                logger.warn('Failed to persist NFC-e result', { error: (e as Error).message });
            }

            return sefazResponse;

        } catch (error) {
            logger.error(`NFC-e emission failed`, {
                invoiceNumber: nfeData.invoice.invoiceNumber,
                error: (error as Error).message
            });
            throw new AppError(`NFC-e emission failed: ${(error as Error).message}`, 500);
        }
    }

    private async generateNFCeXml(
        nfeData: NFeInvoiceData,
        fiscalProfile: any,
        seriesNumber: number,
        invoiceNumber: number
    ): Promise<string> {
        const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const now = new Date();
        const aamm = (now.getFullYear() % 100).toString().padStart(2, '0') +
            (now.getMonth() + 1).toString().padStart(2, '0');

        const issuerCnpj = fiscalProfile.cnpj || nfeData.issuer?.cnpj;
        if (!issuerCnpj) {
            throw new AppError('Issuer CNPJ not configured', 400);
        }

        const accessKey = generateAccessKey({
            cUF: '35', // SP
            aamm,
            cnpj: issuerCnpj.replace(/\D/g, ''),
            mod: '65', // NFC-e
            serie: seriesNumber.toString(),
            nNF: invoiceNumber.toString(),
            tpEmis: '1',
            cNF,
        });

        const tpAmb = fiscalProfile.sefazEnvironment === 'producao' ? '1' : '2' as '1' | '2';
        const crt = fiscalProfile.taxRegime === 'simple_national' ? '1' : '3';

        const address = typeof fiscalProfile.address === 'string'
            ? JSON.parse(fiscalProfile.address)
            : fiscalProfile.address || {};

        const dest: NFeXmlData['dest'] = nfeData.customer ? {
            CNPJ: nfeData.customer.cnpjCpf?.length > 11 ? nfeData.customer.cnpjCpf.replace(/\D/g, '') : undefined,
            CPF: nfeData.customer.cnpjCpf?.length <= 11 ? nfeData.customer.cnpjCpf.replace(/\D/g, '') : undefined,
            xNome: nfeData.customer.name,
            indIEDest: '9' as const, // Non-contributor
            // Address optional
        } : {
            // Default consumer to avoid XML builder accessing undefined
            CPF: '00000000000',
            xNome: 'Consumidor Final',
            indIEDest: '9' as const
        };

        const xmlData: NFeXmlData = {
            ide: {
                cUF: '35',
                natOp: 'VENDA CONSUMIDOR',
                mod: '65',
                serie: seriesNumber.toString(),
                nNF: invoiceNumber.toString(),
                dhEmi: nfeData.invoice.createdAt.toISOString(),
                tpNF: '1',
                idDest: '1', // 1=Internal, 2=Interstate (NFC-e always 1)
                cMunFG: '3550308',
                tpImp: '4', // 4=DANFE NFC-e
                tpEmis: '1',
                tpAmb,
                finNFe: '1',
                indFinal: '1',
                indPres: '1', // 1=Presencial
                procEmi: '0',
                verProc: 'MedManager 2.0',
            },
            emit: {
                CNPJ: issuerCnpj.replace(/\D/g, ''),
                xNome: fiscalProfile.companyName || nfeData.issuer?.name,
                xFant: fiscalProfile.tradingName || nfeData.issuer?.name,
                IE: fiscalProfile.stateRegistration || '',
                IM: fiscalProfile.municipalRegistration,
                CRT: crt,
                enderEmit: {
                    xLgr: address.street || 'Rua Principal',
                    nro: address.number || 'S/N',
                    xCpl: address.complement,
                    xBairro: address.district || 'Centro',
                    cMun: address.cityCode || '3550308',
                    xMun: address.city || 'São Paulo',
                    UF: address.state || 'SP',
                    CEP: (address.zipCode || '01000000').replace(/\D/g, ''),
                    cPais: '1058',
                    xPais: 'BRASIL',
                    fone: fiscalProfile.phone?.replace(/\D/g, ''),
                },
            },
            dest,

            det: nfeData.items.map((item, index) => ({
                nItem: (index + 1).toString(),
                prod: {
                    cProd: item.product.id,
                    cEAN: item.product.gtin || 'SEM GTIN',
                    xProd: item.product.name,
                    NCM: item.product.ncm || '00000000',
                    CFOP: item.product.cfop || '5102',
                    uCom: item.product.unit,
                    qCom: item.quantity.toFixed(4),
                    vUnCom: item.unitPrice.toFixed(4),
                    vProd: item.total.toFixed(2),
                    uTrib: item.product.unit,
                    qTrib: item.quantity.toFixed(4),
                    vUnTrib: item.unitPrice.toFixed(4),
                    vDesc: item.discount > 0 ? item.discount.toFixed(2) : undefined,
                    indTot: '1',
                },
                imposto: {
                    ICMS: {
                        ICMSSN102: { orig: '0', CSOSN: '102' }
                    },
                    PIS: { PISOutr: { CST: '99', vPIS: '0.00' } },
                    COFINS: { COFINSOutr: { CST: '99', vCOFINS: '0.00' } }
                }
            })),
            total: {
                ICMSTot: {
                    vBC: '0.00',
                    vICMS: '0.00',
                    vICMSDeson: '0.00',
                    vFCP: '0.00',
                    vBCST: '0.00',
                    vST: '0.00',
                    vFCPST: '0.00',
                    vFCPSTRet: '0.00',
                    vProd: nfeData.invoice.subtotal.toFixed(2),
                    vFrete: '0.00',
                    vSeg: '0.00',
                    vDesc: nfeData.invoice.discount.toFixed(2),
                    vII: '0.00',
                    vIPI: '0.00',
                    vIPIDevol: '0.00',
                    vPIS: '0.00',
                    vCOFINS: '0.00',
                    vOutro: '0.00',
                    vNF: nfeData.invoice.total.toFixed(2),
                },
            },
            transp: { modFrete: '9' },
            pag: {
                detPag: [{
                    tPag: '01', // 01=Dinheiro (Simplified)
                    vPag: nfeData.invoice.total.toFixed(2),
                }],
            },
        };

        return buildNFeXml(xmlData, accessKey);
    }

    private async signXml(xml: string, fiscalProfile: any): Promise<string> {
        if (!fiscalProfile.certificatePath || !fiscalProfile.certificatePassword) {
            throw new AppError('Certificate required for signing', 400);
        }
        const encryptedPfxBase64 = await fs.readFile(fiscalProfile.certificatePath, 'utf-8');
        const pfxBuffer = decryptCertificate(encryptedPfxBase64.trim());
        return (signXml({ xml, pfxBuffer, pfxPassword: fiscalProfile.certificatePassword })).signedXml;
    }

    private async sendToSefaz(xml: string, nfeData: NFeInvoiceData, fiscalProfile: any): Promise<SefazResponse> {
        const environment = fiscalProfile.sefazEnvironment === 'producao' ? 'production' : 'homologation';
        const sefazConfig: SefazConfig = {
            environment,
            state: 'SP',
            certificatePath: fiscalProfile.certificatePath,
            certificatePassword: fiscalProfile.certificatePassword
        };
        const sefazService = new SefazService(sefazConfig);
        await sefazService.loadCertificate();

        const accessKeyMatch = xml.match(/NFe(\d{44})/);
        const accessKey = accessKeyMatch ? accessKeyMatch[1] : '';
        const idLote = Date.now().toString();

        // SefazService.autorizarNFe defaults to NFe 55, but also accepts 65 if the XML is correct
        // Important: indSinc=1 for NFC-e
        const authResponse = await sefazService.autorizarNFe(xml, idLote);

        return {
            success: authResponse.status === 'success',
            accessKey,
            protocolNumber: authResponse.protocol,
            status: authResponse.status === 'success' ? 'authorized' : 'denied',
            statusCode: authResponse.statusCode,
            statusMessage: authResponse.statusMessage,
            xml: authResponse.xml || xml,
            sefazResponse: authResponse
        };
    }
}

export const nfceService = new NFCeService();
