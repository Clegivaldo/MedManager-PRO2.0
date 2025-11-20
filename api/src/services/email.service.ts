import nodemailer from 'nodemailer';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || '';
    const smtpPass = process.env.SMTP_PASS || '';

    // Se não houver configuração SMTP, usar ethereal para testes
    if (!smtpHost || !smtpUser) {
      logger.warn('SMTP not configured. Emails will be logged only (development mode).');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const fromEmail = process.env.FROM_EMAIL || 'noreply@medmanager.com';

    // Se não houver transporter configurado, apenas logar
    if (!this.transporter) {
      logger.info('Email would be sent (dev mode):', {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html,
      });
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info('Email sent successfully:', { messageId: info.messageId, to: options.to });
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Recuperação de Senha - MedManager-PRO</h2>
        <p>Você solicitou a recuperação de senha da sua conta.</p>
        <p>Clique no botão abaixo para redefinir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Este link expira em 30 minutos.<br>
          Se você não solicitou esta recuperação, ignore este email.
        </p>
        <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
          Ou copie e cole este link no navegador:<br>
          <span style="color: #2563eb;">${resetUrl}</span>
        </p>
      </div>
    `;

    const text = `
Recuperação de Senha - MedManager-PRO

Você solicitou a recuperação de senha da sua conta.

Acesse o link abaixo para redefinir sua senha:
${resetUrl}

Este link expira em 30 minutos.
Se você não solicitou esta recuperação, ignore este email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Recuperação de Senha - MedManager-PRO',
      text,
      html,
    });
  }
}

export const emailService = new EmailService();
