import forge from 'node-forge';
import crypto from 'crypto';
import { logger } from './logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Interface para informações extraídas do certificado
 */
export interface CertificateInfo {
  subject: {
    CN: string;
    O?: string;
    OU?: string;
  };
  issuer: {
    CN: string;
    O?: string;
  };
  notBefore: Date;
  notAfter: Date;
  serialNumber: string;
  isValid: boolean;
  daysUntilExpiry: number;
}

/**
 * Extrai informações de um certificado .pfx
 */
export function extractCertificateInfo(
  pfxBuffer: Buffer,
  password: string
): CertificateInfo {
  try {
    // Converter buffer para formato base64
    const pfxBase64 = pfxBuffer.toString('base64');
    const pfxAsn1 = forge.util.decode64(pfxBase64);
    
    // Parse do arquivo PKCS#12
    const p12Asn1 = forge.asn1.fromDer(pfxAsn1);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extrair certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    
    if (!certBag || certBag.length === 0) {
      throw new AppError('No certificate found in .pfx file', 400);
    }

    const cert = certBag[0].cert;
    if (!cert) {
      throw new AppError('Invalid certificate in .pfx file', 400);
    }

    // Extrair informações do certificado
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const now = new Date();
    
    const isValid = now >= notBefore && now <= notAfter;
    const daysUntilExpiry = Math.floor((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const subject: any = {};
    cert.subject.attributes.forEach(attr => {
      if (attr.shortName) {
        subject[attr.shortName] = attr.value;
      }
    });

    const issuer: any = {};
    cert.issuer.attributes.forEach(attr => {
      if (attr.shortName) {
        issuer[attr.shortName] = attr.value;
      }
    });

    logger.info('Certificate information extracted', {
      subject: subject.CN,
      notBefore,
      notAfter,
      daysUntilExpiry,
      isValid
    });

    return {
      subject: {
        CN: subject.CN || 'Unknown',
        O: subject.O,
        OU: subject.OU
      },
      issuer: {
        CN: issuer.CN || 'Unknown',
        O: issuer.O
      },
      notBefore,
      notAfter,
      serialNumber: cert.serialNumber,
      isValid,
      daysUntilExpiry
    };

  } catch (error) {
    logger.error('Failed to extract certificate info', { error: (error as Error).message });
    
    if (error instanceof AppError) {
      throw error;
    }
    
    // Erro de senha incorreta ou arquivo corrompido
    if ((error as Error).message.includes('MAC')) {
      throw new AppError('Invalid certificate password', 401);
    }
    
    throw new AppError('Failed to read certificate file. Make sure it is a valid .pfx file.', 400);
  }
}

/**
 * Valida se o certificado está válido e não expira em breve
 */
export function validateCertificate(certInfo: CertificateInfo): void {
  if (!certInfo.isValid) {
    if (new Date() < certInfo.notBefore) {
      throw new AppError('Certificate is not yet valid', 400);
    }
    throw new AppError('Certificate has expired', 400);
  }

  // Alertar se certificado expira em menos de 30 dias
  if (certInfo.daysUntilExpiry < 30) {
    logger.warn('Certificate expiring soon', {
      daysUntilExpiry: certInfo.daysUntilExpiry,
      notAfter: certInfo.notAfter,
      subject: certInfo.subject.CN
    });
  }

  // Bloquear se certificado expira em menos de 7 dias
  if (certInfo.daysUntilExpiry < 7) {
    throw new AppError(
      `Certificate expires in ${certInfo.daysUntilExpiry} days. Please renew it before using.`,
      400
    );
  }
}

/**
 * Criptografa conteúdo do certificado para armazenamento
 */
// Criptografar certificado para armazenamento usando AES-256-GCM
export function encryptCertificate(data: Buffer): string {
  
  // Obter chave de criptografia da variável de ambiente
  const encryptionKey = process.env.CERTIFICATE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('CERTIFICATE_ENCRYPTION_KEY not configured');
  }
  
  // Garantir que a chave tenha 32 bytes (256 bits)
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  // Gerar IV aleatório (12 bytes para GCM)
  const iv = crypto.randomBytes(12);
  
  // Criar cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  // Criptografar dados
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  
  // Obter auth tag
  const authTag = cipher.getAuthTag();
  
  // Combinar IV + AuthTag + Encrypted data e converter para base64
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString('base64');
}

/**
 * Descriptografa conteúdo do certificado do armazenamento
 */
// Descriptografar certificado usando AES-256-GCM
export function decryptCertificate(encrypted: string): Buffer {
  
  // Obter chave de criptografia
  const encryptionKey = process.env.CERTIFICATE_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('CERTIFICATE_ENCRYPTION_KEY not configured');
  }
  
  // Garantir que a chave tenha 32 bytes (256 bits)
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  
  // Decodificar base64
  const data = Buffer.from(encrypted, 'base64');
  
  // Extrair IV (12 bytes), AuthTag (16 bytes) e dados criptografados
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encryptedData = data.subarray(28);
  
  // Criar decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  // Descriptografar dados
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted;
}
