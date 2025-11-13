import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

/**
 * Middleware de validação de requisições
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar o corpo da requisição
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Validation error:', { errors, body: req.body });

        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      } else {
        logger.error('Unknown validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal validation error'
        });
      }
    }
  };
}

/**
 * Middleware de validação de parâmetros de rota
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Params validation error:', { errors, params: req.params });

        res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors
        });
      } else {
        logger.error('Unknown params validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal validation error'
        });
      }
    }
  };
}

/**
 * Middleware de validação de query strings
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        logger.warn('Query validation error:', { errors, query: req.query });

        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors
        });
      } else {
        logger.error('Unknown query validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal validation error'
        });
      }
    }
  };
}