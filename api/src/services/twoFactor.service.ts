import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prismaMaster } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export class TwoFactorService {
  /**
   * Gera secret e QR Code para configuração do 2FA
   */
  async generateSecret(userId: string, email: string): Promise<TwoFactorSetup> {
    // Gera secret
    const secret = speakeasy.generateSecret({
      name: `MedManager PRO (${email})`,
      issuer: 'MedManager',
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new AppError('Failed to generate 2FA secret', 500);
    }

    // Gera QR Code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Gera backup codes (8 códigos de 8 caracteres)
    const backupCodes = this.generateBackupCodes(8);

    // Armazena secret temporário (ainda não ativado)
    await prismaMaster.user.update({
      where: { id: userId },
      data: {
        two_factor_secret: secret.base32,
        two_factor_backup_codes: backupCodes,
      },
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verifica código TOTP e ativa 2FA
   */
  async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await prismaMaster.user.findUnique({
      where: { id: userId },
      select: { two_factor_secret: true, two_factor_enabled: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.two_factor_enabled) {
      throw new AppError('2FA already enabled', 400);
    }

    if (!user.two_factor_secret) {
      throw new AppError('2FA not configured. Generate secret first', 400);
    }

    // Verifica token
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2, // Aceita tokens de até 2 intervalos de tempo (±60s)
    });

    if (!isValid) {
      throw new AppError('Invalid verification code', 400);
    }

    // Ativa 2FA
    await prismaMaster.user.update({
      where: { id: userId },
      data: { two_factor_enabled: true },
    });

    return true;
  }

  /**
   * Desativa 2FA
   */
  async disableTwoFactor(userId: string, token: string): Promise<boolean> {
    const user = await prismaMaster.user.findUnique({
      where: { id: userId },
      select: {
        two_factor_secret: true,
        two_factor_enabled: true,
        two_factor_backup_codes: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.two_factor_enabled) {
      throw new AppError('2FA not enabled', 400);
    }

    // Verifica se é token TOTP ou backup code
    const isValidToken = user.two_factor_secret
      ? speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token,
          window: 2,
        })
      : false;

    const isValidBackupCode =
      user.two_factor_backup_codes?.includes(token) || false;

    if (!isValidToken && !isValidBackupCode) {
      throw new AppError('Invalid verification code or backup code', 400);
    }

    // Desativa 2FA e limpa dados
    await prismaMaster.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      },
    });

    return true;
  }

  /**
   * Verifica código TOTP durante login
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prismaMaster.user.findUnique({
      where: { id: userId },
      select: {
        two_factor_secret: true,
        two_factor_enabled: true,
        two_factor_backup_codes: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.two_factor_enabled) {
      return true; // 2FA não habilitado, passa automaticamente
    }

    // Verifica token TOTP
    if (user.two_factor_secret) {
      const isValidToken = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (isValidToken) {
        return true;
      }
    }

    // Verifica backup code
    if (user.two_factor_backup_codes?.includes(token)) {
      // Remove backup code usado
      const updatedCodes = user.two_factor_backup_codes.filter(
        (code) => code !== token
      );

      await prismaMaster.user.update({
        where: { id: userId },
        data: { two_factor_backup_codes: updatedCodes },
      });

      return true;
    }

    return false;
  }

  /**
   * Gera novos backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await prismaMaster.user.findUnique({
      where: { id: userId },
      select: { two_factor_enabled: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.two_factor_enabled) {
      throw new AppError('2FA not enabled', 400);
    }

    const backupCodes = this.generateBackupCodes(8);

    await prismaMaster.user.update({
      where: { id: userId },
      data: { two_factor_backup_codes: backupCodes },
    });

    return backupCodes;
  }

  /**
   * Gera códigos de backup aleatórios
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Verifica se usuário tem 2FA habilitado
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const user = await prismaMaster.user.findUnique({
      where: { id: userId },
      select: { two_factor_enabled: true },
    });

    return user?.two_factor_enabled || false;
  }
}

export const twoFactorService = new TwoFactorService();
