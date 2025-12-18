import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Classe de erro personalizada para a aplicação
 */
export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de tratamento de erros global
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log detalhado do erro original (sem sobrescrever propriedades)
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      statusCode: (err as any)?.statusCode,
      code: (err as any)?.code,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    },
    timestamp: new Date().toISOString()
  });

  // Valores padrão preservando possíveis propriedades personalizadas
  let statusCode = (err as any)?.statusCode ?? 500;
  let code: string | undefined = (err as any)?.code ?? 'INTERNAL_ERROR';
  let message = err.message || 'Server Error';

  // Especializações somente se não houver status explícito do erro original
  if (statusCode === 500) {
    // Erros do Prisma
    if (err.name === 'PrismaClientKnownRequestError') {
      statusCode = 400;
      code = 'DATABASE_ERROR';
      message = 'Database operation failed';
    } else if (err.name === 'PrismaClientValidationError') {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      message = 'Database validation error';
    } else if ((err as any).code === 11000) { // Duplicate key (ex.: Mongo)
      statusCode = 400;
      code = 'DUPLICATE_FIELD';
      message = 'Duplicate field value entered';
    } else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      code = 'INVALID_TOKEN';
      message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      code = 'TOKEN_EXPIRED';
      message = 'Token expired';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(config.isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Captura exceções não tratadas
 */
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    timestamp: new Date().toISOString()
  });

  // Also print to stdout/stderr to ensure Docker captures full stack
  try {
    console.error('UNCAUGHT EXCEPTION:', err.stack || err);
  } catch (e) {
    // noop
  }

  process.exit(1);
});

/**
 * Captura promessas rejeitadas não tratadas
 */
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    reason,
    promise,
    timestamp: new Date().toISOString()
  });

  // Also print to stdout/stderr to ensure Docker captures the reason
  try {
    console.error('UNHANDLED REJECTION:', reason);
  } catch (e) {
    // noop
  }

  // Fechar servidor e sair graciosamente
  process.exit(1);
});

import { config } from '../config/environment.js';