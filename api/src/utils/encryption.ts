import crypto from 'crypto';

// Usa CERTIFICATE_ENCRYPTION_KEY como base; se não existir ENCRYPTION_KEY
const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.CERTIFICATE_ENCRYPTION_KEY || 'dev-encryption-key-change-me';

// Deriva chave de 32 bytes via SHA-256
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); // 32 bytes

export interface EncryptedPayload {
  version: string; // v1
  iv: string; // base64
  tag: string; // base64 auth tag
  data: string; // base64 ciphertext
}

// Formato serializado: v1:iv:tag:data
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12); // GCM IV 96 bits
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(serialized: string | null | undefined): string | null {
  if (!serialized) return null;
  const parts = serialized.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') return null; // formato inválido

  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function maskSecret(secret: string | null | undefined): string | null {
  if (!secret) return null;
  const len = secret.length;
  if (len <= 8) return secret[0] + '***' + secret[len - 1];
  const head = secret.slice(0, 4);
  const tail = secret.slice(-4);
  return `${head}***${tail}`;
}

/**
 * Encripta arquivo de backup (usualmente um arquivo SQL.GZ)
 * Lê arquivo, encripta conteúdo, salva como arquivo.enc
 */
export function encryptBackupFile(inputPath: string, outputPath: string): void {
  const fs = require('fs');
  const data = fs.readFileSync(inputPath);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Formato: v1:iv:tag:data (tudo em base64)
  const header = Buffer.from(`v1:${iv.toString('base64')}:${tag.toString('base64')}:`);
  fs.writeFileSync(outputPath, Buffer.concat([header, encrypted]));
}

/**
 * Decripta arquivo de backup
 */
export function decryptBackupFile(inputPath: string, outputPath: string): void {
  const fs = require('fs');
  const encrypted = fs.readFileSync(inputPath);

  // Parse: v1:iv:tag:data
  const headerEnd = encrypted.indexOf(Buffer.from(':data:'));
  if (headerEnd === -1) throw new Error('Invalid encrypted backup format');

  const header = encrypted.slice(0, headerEnd).toString('utf8');
  const parts = header.split(':');
  if (parts.length < 3 || parts[0] !== 'v1') throw new Error('Invalid backup header');

  const [, ivB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = encrypted.slice(headerEnd + 6); // Skip ':data:'

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  fs.writeFileSync(outputPath, decrypted);
}
