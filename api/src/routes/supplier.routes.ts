import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const router: Router = Router();

// Rotas de fornecedores
router.get('/', authenticateToken, requirePermission('SUPPLIER_LIST'), async (req, res, next) => {
  try {
    res.json({ message: 'Supplier list - implementar' });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requirePermission('SUPPLIER_CREATE'), async (req, res, next) => {
  try {
    res.json({ message: 'Supplier create - implementar' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, requirePermission('SUPPLIER_VIEW'), async (req, res, next) => {
  try {
    res.json({ message: 'Supplier view - implementar' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, requirePermission('SUPPLIER_UPDATE'), async (req, res, next) => {
  try {
    res.json({ message: 'Supplier update - implementar' });
  } catch (error) {
    next(error);
  }
});

export default router;