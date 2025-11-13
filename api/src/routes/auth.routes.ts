import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = Router();

/**
 * Rotas de autenticação
 */

// Login (requer tenant identification via header)
router.post('/login', tenantMiddleware, authController.login);

// Registro (requer autenticação)
router.post('/register', authenticateToken, authController.register);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Obter perfil
router.get('/profile', authenticateToken, authController.getProfile);

// Logout
router.post('/logout', authenticateToken, authController.logout);

export default router;