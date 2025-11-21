import { prismaMaster } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { emailService } from '../services/email.service.js';
import { addDays, differenceInDays } from 'date-fns';

/**
 * Cron Job para verificar assinaturas e enviar notificações
 * 
 * Executar diariamente:
 * - Detecta assinaturas expirando nos próximos 7, 3 e 1 dias
 * - Envia notificações por email
 * - Atualiza status de assinaturas expiradas
 * - Gera relatório de assinaturas críticas
 * 
 * Uso:
 *   npx tsx src/scripts/check-subscriptions-cron.ts
 * 
 * Crontab:
 *   0 9 * * * cd /app && npx tsx src/scripts/check-subscriptions-cron.ts
 */

interface SubscriptionAlert {
  tenant: {
    id: string;
    name: string;
    cnpj: string;
    email?: string;
  };
  subscription: {
    id: string;
    endDate: Date;
    status: string;
    planName: string;
  };
  daysUntilExpiration: number;
  urgency: 'critical' | 'high' | 'medium';
}

async function checkSubscriptions() {
  try {
    logger.info('=== Iniciando verificação de assinaturas ===');

    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);
    
    // Buscar assinaturas ativas que vão expirar nos próximos 7 dias
    const expiringSubscriptions = await prismaMaster.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          lte: sevenDaysFromNow,
          gte: now,
        },
      },
      include: {
        tenant: true,
        plan: true,
      },
      orderBy: {
        endDate: 'asc',
      },
    });

    logger.info(`Encontradas ${expiringSubscriptions.length} assinaturas expirando em breve`);

    // Processar alertas
    const alerts: SubscriptionAlert[] = [];

    for (const subscription of expiringSubscriptions) {
      const daysUntilExpiration = differenceInDays(subscription.endDate, now);

      // Determinar urgência
      let urgency: 'critical' | 'high' | 'medium' = 'medium';
      if (daysUntilExpiration <= 1) {
        urgency = 'critical';
      } else if (daysUntilExpiration <= 3) {
        urgency = 'high';
      }

      alerts.push({
        tenant: {
          id: subscription.tenant.id,
          name: subscription.tenant.name,
          cnpj: subscription.tenant.cnpj,
          email: subscription.tenant.metadata
            ? (subscription.tenant.metadata as any).contactEmail
            : undefined,
        },
        subscription: {
          id: subscription.id,
          endDate: subscription.endDate,
          status: subscription.status,
          planName: subscription.plan.displayName,
        },
        daysUntilExpiration,
        urgency,
      });
    }

    // Enviar notificações
    await sendNotifications(alerts);

    // Atualizar status de assinaturas expiradas
    await updateExpiredSubscriptions();

    // Gerar relatório
    await generateReport(alerts);

    logger.info('=== Verificação de assinaturas concluída ===');
  } catch (error) {
    logger.error('Erro ao verificar assinaturas:', error);
    throw error;
  }
}

async function sendNotifications(alerts: SubscriptionAlert[]) {
  logger.info(`Enviando notificações para ${alerts.length} tenant(s)`);

  let sentCount = 0;
  let errorCount = 0;

  for (const alert of alerts) {
    try {
      // Enviar notificação por email se disponível
      const email = alert.tenant.email;
      if (email) {
        const subject = getEmailSubject(alert);
        const body = getEmailBody(alert);

        await emailService.sendEmail({
          to: email,
          subject,
          html: body,
        });

        sentCount++;
        logger.info(`✓ Notificação enviada para ${alert.tenant.name} (${alert.daysUntilExpiration} dias)`);
      } else {
        logger.warn(`⚠️  Email não encontrado para tenant ${alert.tenant.name}`);
      }

      // Registrar notificação no banco (auditoria)
      await prismaMaster.auditLog.create({
        data: {
          tenantId: alert.tenant.id,
          userId: null,
          tableName: 'Subscription',
          recordId: alert.subscription.id,
          operation: 'NOTIFICATION',
          newData: {
            type: 'subscription_expiring',
            daysUntilExpiration: alert.daysUntilExpiration,
            urgency: alert.urgency,
            emailSent: !!email,
          },
        },
      }).catch(() => {
        // Ignorar erro de auditoria para não interromper fluxo
      });

    } catch (error) {
      errorCount++;
      logger.error(`Erro ao enviar notificação para ${alert.tenant.name}:`, error);
    }
  }

  logger.info(`Notificações enviadas: ${sentCount} sucesso, ${errorCount} erro(s)`);
}

function getEmailSubject(alert: SubscriptionAlert): string {
  if (alert.urgency === 'critical') {
    return '🚨 URGENTE: Sua assinatura expira em 24 horas!';
  } else if (alert.urgency === 'high') {
    return '⚠️  Sua assinatura expira em breve';
  }
  return '📅 Lembrete: Renovação de assinatura';
}

function getEmailBody(alert: SubscriptionAlert): string {
  const expirationDate = alert.subscription.endDate.toLocaleDateString('pt-BR');
  const daysText = alert.daysUntilExpiration === 1 ? '1 dia' : `${alert.daysUntilExpiration} dias`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${alert.urgency === 'critical' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
        .cta { text-align: center; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${getEmailSubject(alert)}</h2>
        </div>
        <div class="content">
          <p>Olá, <strong>${alert.tenant.name}</strong>!</p>
          
          <p>Sua assinatura do MedManager PRO está próxima do vencimento.</p>
          
          <div class="info">
            <strong>Detalhes da Assinatura:</strong><br>
            Plano: ${alert.subscription.planName}<br>
            Data de Expiração: ${expirationDate}<br>
            Tempo Restante: <strong>${daysText}</strong>
          </div>
          
          ${alert.urgency === 'critical' 
            ? '<p><strong style="color: #dc3545;">⚠️  ATENÇÃO:</strong> Após a expiração, o acesso ao sistema será bloqueado!</p>'
            : '<p>Renove agora para continuar aproveitando todos os recursos do sistema.</p>'
          }
          
          <div class="cta">
            <a href="https://medmanager.com.br/renovar" class="button">Renovar Assinatura</a>
          </div>
          
          <p>Em caso de dúvidas, entre em contato com nosso suporte:</p>
          <ul>
            <li>Email: suporte@medmanager.com.br</li>
            <li>Telefone: (11) 1234-5678</li>
          </ul>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} MedManager PRO - Todos os direitos reservados</p>
          <p>Este é um email automático. Por favor, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function updateExpiredSubscriptions() {
  logger.info('Atualizando status de assinaturas expiradas...');

  const now = new Date();

  // Atualizar subscriptions expiradas que ainda estão como 'active'
  const result = await prismaMaster.subscription.updateMany({
    where: {
      status: 'active',
      endDate: {
        lt: now,
      },
    },
    data: {
      status: 'expired',
    },
  });

  if (result.count > 0) {
    logger.info(`✓ ${result.count} assinatura(s) marcada(s) como expirada(s)`);

    // Atualizar também o tenant
    const expiredSubscriptions = await prismaMaster.subscription.findMany({
      where: {
        status: 'expired',
        tenant: {
          subscriptionStatus: {
            not: 'expired',
          },
        },
      },
      select: {
        tenantId: true,
      },
    });

    for (const sub of expiredSubscriptions) {
      await prismaMaster.tenant.update({
        where: { id: sub.tenantId },
        data: { subscriptionStatus: 'expired' },
      });
    }
  } else {
    logger.info('Nenhuma assinatura expirada para atualizar');
  }
}

async function generateReport(alerts: SubscriptionAlert[]) {
  logger.info('=== RELATÓRIO DE ASSINATURAS ===');

  const critical = alerts.filter((a) => a.urgency === 'critical');
  const high = alerts.filter((a) => a.urgency === 'high');
  const medium = alerts.filter((a) => a.urgency === 'medium');

  logger.info(`Críticas (≤1 dia): ${critical.length}`);
  logger.info(`Alta (≤3 dias): ${high.length}`);
  logger.info(`Média (≤7 dias): ${medium.length}`);

  if (critical.length > 0) {
    logger.warn('⚠️  ASSINATURAS CRÍTICAS:');
    critical.forEach((alert) => {
      logger.warn(`  - ${alert.tenant.name} (CNPJ: ${alert.tenant.cnpj}) - Expira em ${alert.daysUntilExpiration} dia(s)`);
    });
  }

  // Estatísticas gerais
  const totalActive = await prismaMaster.subscription.count({
    where: { status: 'active' },
  });

  const totalExpired = await prismaMaster.subscription.count({
    where: { status: 'expired' },
  });

  logger.info(`Total de assinaturas ativas: ${totalActive}`);
  logger.info(`Total de assinaturas expiradas: ${totalExpired}`);
}

// Executar o cron job
checkSubscriptions()
  .then(() => {
    logger.info('✓ Cron job executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Erro no cron job:', error);
    process.exit(1);
  })
  .finally(() => {
    prismaMaster.$disconnect();
  });
