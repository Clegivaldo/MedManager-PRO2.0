import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/permissions.js';

const router: Router = Router();

// Rotas de usuários
router.get('/', authenticateToken, requirePermission(PERMISSIONS.USER_READ), async (req, res, next) => {
  try {
    res.json({ message: 'User list - implementar' });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, requirePermission(PERMISSIONS.USER_CREATE), async (req, res, next) => {
  try {
    res.json({ message: 'User create - implementar' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, requirePermission(PERMISSIONS.USER_READ), async (req, res, next) => {
  try {
    res.json({ message: 'User view - implementar' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, requirePermission(PERMISSIONS.USER_UPDATE), async (req, res, next) => {
  try {
    res.json({ message: 'User update - implementar' });
  } catch (error) {
    next(error);
  }
});

export default router;