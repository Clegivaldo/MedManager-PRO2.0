import * as forge from 'node-forge';
import { createHash } from 'crypto';

/**
 * Utilitário para assinatura digital de XML NFe usando certificado A1 (PKCS#12)
 * Implementa padrão XML Signature conforme especificação da Receita Federal
 */

export interface SignXmlOptions {
  xml: string;
  pfxBuffer: Buffer;
  pfxPassword: string;
  signatureId?: string;
}

export interface SignatureResult {
  signedXml: string;
  signatureValue: string;
  digestValue: string;
}

/**
 * Assina um XML usando certificado digital A1 (PFX/PKCS#12)
 * @param options - Opções contendo XML, certificado PFX e senha
 * @returns XML assinado com a tag Signature inserida
 */
export function signXml(options: SignXmlOptions): SignatureResult {
  const { xml, pfxBuffer, pfxPassword, signatureId = 'SignatureId' } = options;

  try {
    // 1. Carregar certificado PFX
    const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPassword);

    // 2. Extrair chave privada e certificado
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];
    
    if (!certBag || !certBag.cert) {
      throw new Error('Certificate not found in PFX file');
    }

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    
    if (!keyBag || !keyBag.key) {
      throw new Error('Private key not found in PFX file');
    }

    const certificate = certBag.cert;
    const privateKey = keyBag.key as forge.pki.rsa.PrivateKey;

    // 3. Extrair ID do elemento a ser assinado (infNFe)
    const infNFeIdMatch = xml.match(/infNFe\s+Id="([^"]+)"/);
    if (!infNFeIdMatch) {
      throw new Error('infNFe Id not found in XML');
    }
    const infNFeId = infNFeIdMatch[1];

    // 4. Canonicalizar o elemento infNFe para calcular o digest
    const infNFeMatch = xml.match(/<infNFe[^>]*>[\s\S]*?<\/infNFe>/);
    if (!infNFeMatch) {
      throw new Error('infNFe element not found in XML');
    }
    const infNFeElement = infNFeMatch[0];
    
    // Canonicalização C14N (simplificada - em produção usar biblioteca específica)
    const canonicalizedXml = canonicalizeXml(infNFeElement);

    // 5. Calcular SHA-1 digest do elemento canonicalizado
    const md = forge.md.sha1.create();
    md.update(canonicalizedXml, 'utf8');
    const digestValue = forge.util.encode64(md.digest().bytes());

    // 6. Criar SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1" />
<Reference URI="#${infNFeId}">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature" />
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1" />
<DigestValue>${digestValue}</DigestValue>
</Reference>
</SignedInfo>`;

    // 7. Canonicalizar SignedInfo
    const canonicalizedSignedInfo = canonicalizeXml(signedInfo);

    // 8. Assinar SignedInfo com a chave privada
    const mdSignedInfo = forge.md.sha1.create();
    mdSignedInfo.update(canonicalizedSignedInfo, 'utf8');
    const signature = privateKey.sign(mdSignedInfo);
    const signatureValue = forge.util.encode64(signature);

    // 9. Extrair informações do certificado
    const x509Certificate = forge.util.encode64(
      forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes()
    );

    // 10. Construir elemento Signature completo
    const signatureElement = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
${signedInfo}
<SignatureValue>${signatureValue}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${x509Certificate}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;

    // 11. Inserir Signature logo após o fechamento de infNFe
    const signedXml = xml.replace(
      '</infNFe>',
      `</infNFe>${signatureElement}`
    );

    return {
      signedXml,
      signatureValue,
      digestValue,
    };
  } catch (error) {
    throw new Error(`XML signing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Canonicalização XML C14N simplificada
 * Nota: Em produção, usar biblioteca como xml-crypto para C14N completo
 */
function canonicalizeXml(xml: string): string {
  return xml
    .replace(/>\s+</g, '><') // Remove espaços entre tags
    .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
    .replace(/\s*=\s*/g, '=') // Remove espaços ao redor de =
    .replace(/"\s+/g, '" ') // Normaliza após aspas
    .trim();
}

/**
 * Valida se um certificado A1 está válido e não expirado
 */
export function validateCertificate(pfxBuffer: Buffer, pfxPassword: string): {
  valid: boolean;
  expiresAt: Date | null;
  issuer: string | null;
  subject: string | null;
  error?: string;
} {
  try {
    const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPassword);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];

    if (!certBag || !certBag.cert) {
      return { valid: false, expiresAt: null, issuer: null, subject: null, error: 'Certificate not found' };
    }

    const certificate = certBag.cert;
    const now = new Date();
    const notBefore = certificate.validity.notBefore;
    const notAfter = certificate.validity.notAfter;

    const isValid = now >= notBefore && now <= notAfter;

    return {
      valid: isValid,
      expiresAt: notAfter,
      issuer: certificate.issuer.getField('CN')?.value as string || null,
      subject: certificate.subject.getField('CN')?.value as string || null,
      error: isValid ? undefined : 'Certificate expired or not yet valid',
    };
  } catch (error) {
    return {
      valid: false,
      expiresAt: null,
      issuer: null,
      subject: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extrai CNPJ do certificado A1
 */
export function extractCnpjFromCertificate(pfxBuffer: Buffer, pfxPassword: string): string | null {
  try {
    const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxPassword);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];

    if (!certBag || !certBag.cert) {
      return null;
    }

    const certificate = certBag.cert;
    const subjectCN = certificate.subject.getField('CN')?.value as string;

    // CNPJ geralmente está no CN do certificado A1
    // Formato comum: "RAZAO SOCIAL:12345678000190"
    const cnpjMatch = subjectCN?.match(/(\d{14})/);
    return cnpjMatch ? cnpjMatch[1] : null;
  } catch {
    return null;
  }
}
