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
  let error = { ...err };
  error.message = err.message;

  // Log do erro
  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
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

  // Erros do Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    const message = 'Database operation failed';
    error = new AppError(message, 400, 'DATABASE_ERROR');
  }

  if (err.name === 'PrismaClientValidationError') {
    const message = 'Database validation error';
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Erros de validação do Mongoose (se usado)
  if (err.name === 'ValidationError') {
    const message = Object.values(err).map((val: any) => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // Erro de chave duplicada
  if ((err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  res.status((error as AppError).statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    code: (error as AppError).code || 'INTERNAL_ERROR',
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
  
  // Fechar servidor e sair graciosamente
  process.exit(1);
});

import { config } from '../config/environment.js';