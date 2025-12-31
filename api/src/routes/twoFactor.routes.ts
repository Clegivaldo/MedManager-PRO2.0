import { Router, Request, Response } from 'express';
import { twoFactorService } from '../services/twoFactor.service';
import { AppError } from '../middleware/errorHandler';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/2fa/setup
 * Gera secret e QR Code para configuração do 2FA
 */
router.post('/setup', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;

    if (!userId || !email) {
      throw new AppError('User not authenticated', 401);
    }

    const setup = await twoFactorService.generateSecret(userId, email);

    res.json({
      success: true,
      data: {
        secret: setup.secret,
        qrCode: setup.qrCodeUrl,
        backupCodes: setup.backupCodes,
      },
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/2fa/enable
 * Verifica token e ativa 2FA
 */
router.post('/enable', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    await twoFactorService.enableTwoFactor(userId, token);

    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/2fa/disable
 * Desativa 2FA
 */
router.post('/disable', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = req.body;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!token) {
      throw new AppError('Verification token or backup code is required', 400);
    }

    await twoFactorService.disableTwoFactor(userId, token);

    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/2fa/verify
 * Verifica token durante login
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      throw new AppError('User ID and token are required', 400);
    }

    const isValid = await twoFactorService.verifyToken(userId, token);

    if (!isValid) {
      throw new AppError('Invalid verification code', 400);
    }

    res.json({
      success: true,
      message: '2FA verification successful',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/2fa/backup-codes/regenerate
 * Gera novos backup codes
 */
router.post(
  '/backup-codes/regenerate',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const backupCodes = await twoFactorService.regenerateBackupCodes(userId);

      res.json({
        success: true,
        data: { backupCodes },
        message: 'Backup codes regenerated. Save them in a safe place',
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * GET /api/v1/2fa/status
 * Verifica se 2FA está habilitado
 */
router.get('/status', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const isEnabled = await twoFactorService.isTwoFactorEnabled(userId);

    res.json({
      success: true,
      data: { enabled: isEnabled },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
