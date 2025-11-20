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
