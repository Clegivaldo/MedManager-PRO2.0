import { Request, Response, NextFunction } from 'express';
import { productGuia33Integration } from '../services/product-guia33-integration.service.js';
import { AppError } from './errorHandler.js';

/**
 * Middleware para validação automática de substâncias controladas
 * Intercepta operações de venda/dispensação e aplica regras do Guia 33
 */
export const validateControlledSubstance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId) {
      throw new AppError('Tenant context required for controlled substance validation', 400);
    }

    // Verificar se há produtos no request (suporta array ou objeto único)
    const items = req.body.items || (req.body.productId ? [req.body] : []);

    if (items.length === 0) {
      return next(); // Sem produtos, prosseguir
    }

    // Validar cada produto
    const validationResults = [];

    for (const item of items) {
      const {
        productId,
        quantity,
        customerId,
        prescription // { id, date, validityDays }
      } = item;

      if (!productId || !quantity) {
        continue; // Ignorar itens inválidos
      }

      // Verificar se produto é controlado
      const complianceStatus = await productGuia33Integration.checkComplianceStatus(
        tenantId,
        productId
      );

      if (!complianceStatus.isControlled) {
        validationResults.push({
          productId,
          isControlled: false,
          validated: false
        });
        continue; // Produto não controlado, prosseguir
      }

      // Produto controlado - exige validação completa
      if (!customerId) {
        throw new AppError(
          `Customer ID required for controlled substance "${complianceStatus.product?.name}"`,
          400,
          'CUSTOMER_REQUIRED'
        );
      }

      if (!prescription) {
        throw new AppError(
          `Prescription required for controlled substance "${complianceStatus.product?.name}"`,
          400,
          'PRESCRIPTION_REQUIRED'
        );
      }

      // Executar validação e registro
      const validationResult = await productGuia33Integration.validateAndRecordDispensation(
        tenantId,
        productId,
        customerId,
        quantity,
        {
          id: prescription.id || `RX-${Date.now()}`,
          date: new Date(prescription.date),
          validityDays: prescription.validityDays || 30
        },
        userId
      );

      validationResults.push({
        productId,
        isControlled: true,
        validated: true,
        compliance: validationResult.compliance,
        movementId: validationResult.movement?.id
      });
    }

    // Anexar resultados ao request para uso posterior
    (req as any).controlledSubstanceValidation = {
      validated: true,
      results: validationResults,
      hasControlledProducts: validationResults.some((r) => r.isControlled)
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional - apenas verifica sem bloquear
 * Útil para endpoints de consulta/listagem
 */
export const checkControlledSubstance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = (req as any).tenant?.id || (req as any).user?.tenantId;
    const productId = req.params.productId || req.body.productId;

    if (!tenantId || !productId) {
      return next();
    }

    const complianceStatus = await productGuia33Integration.checkComplianceStatus(
      tenantId,
      productId
    );

    (req as any).productComplianceStatus = complianceStatus;

    next();
  } catch (error) {
    next(error);
  }
};
