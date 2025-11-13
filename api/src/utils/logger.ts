import winston from 'winston';
import { config } from '../config/environment.js';

// Configuração do logger
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Configuração de transportes
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.LOG_LEVEL
  })
];

// Adicionar transporte de arquivo em produção
if (config.isProduction) {
  transports.push(
    new winston.transports.File({
      filename: config.LOG_FILE,
      format: logFormat,
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: './logs/error.log',
      format: logFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Criar logger
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false
});

// Stream para middleware de requisição HTTP
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Helper functions para logging
export const logError = (error: Error, context?: string) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

export const logInfo = (message: string, data?: any) => {
  logger.info({
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const logWarn = (message: string, data?: any) => {
  logger.warn({
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const logDebug = (message: string, data?: any) => {
  logger.debug({
    message,
    data,
    timestamp: new Date().toISOString()
  });
};