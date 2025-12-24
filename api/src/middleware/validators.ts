import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';

/**
 * Middleware para executar validações e retornar erros
 */
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new AppError(errorMessages, 400);
  }
  next();
}

/**
 * Validações para criação de usuário
 */
export const validateCreateUser = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula e número'),
  body('role')
    .optional()
    .isIn(['MASTER', 'ADMIN', 'MANAGER', 'OPERATOR'])
    .withMessage('Role inválido'),
  validate
];

/**
 * Validações para atualização de usuário
 */
export const validateUpdateUser = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula e número'),
  validate
];

/**
 * Validações para login
 */
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  validate
];

/**
 * Validações para criação de produto
 */
export const validateCreateProduct = [
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('sku')
    .optional()
    .trim()
    .matches(/^[A-Z0-9-_]+$/i)
    .withMessage('SKU deve conter apenas letras, números, hífens e underscores'),
  body('barcode')
    .optional()
    .trim()
    .matches(/^[0-9]{8,14}$/)
    .withMessage('Código de barras inválido'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Preço deve ser maior ou igual a zero'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estoque deve ser um número inteiro maior ou igual a zero'),
  body('description')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 1000 })
    .withMessage('Descrição deve ter no máximo 1000 caracteres'),
  validate
];

/**
 * Validações para criação de cliente
 */
export const validateCreateCustomer = [
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 200 })
    .withMessage('Nome deve ter entre 2 e 200 caracteres'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-\(\)]+$/)
    .withMessage('Telefone inválido'),
  body('cpf')
    .optional()
    .trim()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)
    .withMessage('CPF inválido'),
  body('cnpj')
    .optional()
    .trim()
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/)
    .withMessage('CNPJ inválido'),
  validate
];

/**
 * Validações para criação de tenant
 */
export const validateCreateTenant = [
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('cnpj')
    .trim()
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/)
    .withMessage('CNPJ inválido'),
  body('plan')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Plano inválido'),
  body('metadata.email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  validate
];

/**
 * Validações para parâmetros UUID
 */
export const validateUuidParam = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  validate
];

/**
 * Validações para busca/paginação
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que zero'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
  query('search')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('Busca deve ter no máximo 100 caracteres'),
  validate
];

/**
 * Sanitizar entrada HTML (previne XSS)
 */
export function sanitizeHtml(dirty: string): string {
  return dirty
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validar e sanitizar entrada SQL-like (camada extra de proteção)
 */
export function sanitizeSqlLike(input: string): string {
  // Prisma já previne SQL injection, mas vamos sanitizar por segurança
  return input
    // Remove aspas simples e ponto-e-vírgula
    .replace(/[';]/g, '')
    // Remove comentários/duplo hífen
    .replace(/--/g, '')
    .trim();
}
