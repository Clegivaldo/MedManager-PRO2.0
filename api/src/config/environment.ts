import dotenv from 'dotenv';
import { z } from 'zod';

// Carregar variáveis de ambiente
dotenv.config();

// Schema de validação das variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3333'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  API_VERSION: z.string().default('v1'),
  UPLOAD_MAX_SIZE: z.string().default('10mb'),
  UPLOAD_DIR: z.string().default('./uploads'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('./logs/app.log'),
  MAX_TENANTS: z.string().default('100'),
  DEFAULT_TENANT_STORAGE_GB: z.string().default('10'),
  TENANT_ISOLATION_ENABLED: z.string().default('true'),
  BACKUP_RETENTION_DAYS: z.string().default('30'),
  ANVISA_SNGPC_ENDPOINT: z.string().optional(),
  ANVISA_SNCM_ENDPOINT: z.string().optional(),
  SEFAZ_NFE_ENDPOINT: z.string().optional(),
  SEFAZ_CERT_PATH: z.string().optional(),
  SEFAZ_CERT_PASSWORD: z.string().optional(),
  ALLOW_NFE_SIMULATION: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
});

// Validar e parsear variáveis de ambiente
const env = envSchema.parse(process.env);

export const config = {
  NODE_ENV: env.NODE_ENV,
  PORT: parseInt(env.PORT),
  DATABASE_URL: env.DATABASE_URL,
  REDIS_URL: env.REDIS_URL,
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,
  API_VERSION: env.API_VERSION,
  UPLOAD_MAX_SIZE: env.UPLOAD_MAX_SIZE,
  UPLOAD_DIR: env.UPLOAD_DIR,
  RATE_LIMIT_WINDOW_MS: parseInt(env.RATE_LIMIT_WINDOW_MS),
  RATE_LIMIT_MAX_REQUESTS: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  LOG_LEVEL: env.LOG_LEVEL,
  LOG_FILE: env.LOG_FILE,
  MAX_TENANTS: parseInt(env.MAX_TENANTS),
  DEFAULT_TENANT_STORAGE_GB: parseInt(env.DEFAULT_TENANT_STORAGE_GB),
  TENANT_ISOLATION_ENABLED: env.TENANT_ISOLATION_ENABLED === 'true',
  BACKUP_RETENTION_DAYS: parseInt(env.BACKUP_RETENTION_DAYS),
  ANVISA_SNGPC_ENDPOINT: env.ANVISA_SNGPC_ENDPOINT,
  ANVISA_SNCM_ENDPOINT: env.ANVISA_SNCM_ENDPOINT,
  SEFAZ_NFE_ENDPOINT: env.SEFAZ_NFE_ENDPOINT,
  SEFAZ_CERT_PATH: env.SEFAZ_CERT_PATH,
  SEFAZ_CERT_PASSWORD: env.SEFAZ_CERT_PASSWORD,
  ALLOW_NFE_SIMULATION: env.ALLOW_NFE_SIMULATION === 'true',
  SMTP_HOST: env.SMTP_HOST,
  SMTP_PORT: env.SMTP_PORT,
  SMTP_USER: env.SMTP_USER,
  SMTP_PASS: env.SMTP_PASS,
  FROM_EMAIL: env.FROM_EMAIL,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
} as const;

// Validar configurações críticas
if (config.NODE_ENV === 'production') {
  if (config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  
  if (config.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in production');
  }
}

