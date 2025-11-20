import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import bcryptjs from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/permissions.js';
import { prismaMaster } from '../lib/prisma.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router: Router = Router();

// Configurar multer para upload de avatar (memória)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = (req as any).tenant?.id || 'unknown';
    const dest = path.join(process.cwd(), 'uploads', 'avatars', tenantId);
    try {
      fsSync.mkdirSync(dest, { recursive: true });
    } catch {}
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new AppError('Somente PNG, JPG e JPEG são permitidos', 400) as any);
  }
});

// Obter perfil do usuário autenticado
router.get('/profile/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const tenantId = (req as any).tenant?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    const prisma = getTenantPrisma((req as any).tenant);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        avatarUrl: true,
      }
    });

    if (!user) throw new AppError('Usuário não encontrado', 404);

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Atualizar perfil do usuário autenticado
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    const { name, email, phone, department } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const prisma = getTenantPrisma((req as any).tenant);
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      }
    });

    logger.info('Perfil do usuário atualizado', { userId });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Upload de avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const tenantId = (req as any).tenant?.id;

    if (!userId) throw new AppError('Usuário não identificado', 400);
    if (!req.file) throw new AppError('Avatar não foi enviado', 400);

    const publicUrl = `/static/avatars/${tenantId}/${req.file.filename}`;

    const prisma = getTenantPrisma((req as any).tenant);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      }
    });

    logger.info('Avatar do usuário atualizado', { userId, filename: req.file.filename });
    res.json({ success: true, avatarUrl: publicUrl, user });
  } catch (error) {
    next(error);
  }
});

// Alterar senha
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Senha atual e nova senha são obrigatórias', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('Nova senha deve ter no mínimo 8 caracteres', 400);
    }

    const prisma = getTenantPrisma((req as any).tenant);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user) throw new AppError('Usuário não encontrado', 404);

    const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Senha atual incorreta', 401);
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logger.info('Senha do usuário alterada', { userId });
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Setup 2FA (criar secret temporário)
router.post('/2fa/setup', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    // TODO: Implementar geração de secret 2FA com speakeasy/otplib
    // Por enquanto, retornar um placeholder
    res.json({
      success: true,
      message: '2FA setup iniciado - verificar com código',
      secret: 'SECRET_PLACEHOLDER',
      qrCode: 'data:image/png;base64,...' // QR code seria gerado aqui
    });
  } catch (error) {
    next(error);
  }
});

// Verify 2FA code
router.post('/2fa/verify', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    const { code } = req.body;
    if (!code) throw new AppError('Código 2FA obrigatório', 400);

    // TODO: Implementar verificação real de código 2FA
    // Por enquanto, aceitar código '000000' como teste
    if (code !== '000000') {
      throw new AppError('Código 2FA inválido', 400);
    }

    const prisma = getTenantPrisma((req as any).tenant);
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });

    logger.info('2FA ativado para usuário', { userId });
    res.json({ success: true, message: '2FA ativado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!userId) throw new AppError('Usuário não identificado', 400);

    const prisma = getTenantPrisma((req as any).tenant);
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false }
    });

    logger.info('2FA desativado para usuário', { userId });
    res.json({ success: true, message: '2FA desativado' });
  } catch (error) {
    next(error);
  }
});

// Gerenciamento de usuários (admin)


export default router;