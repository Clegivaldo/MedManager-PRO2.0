import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeAdminUser } from './scripts/init-admin.js';
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenantMiddleware.js';
import { tenantRateLimit } from './middleware/tenantRateLimit.js';
import authRouter from './routes/auth.routes.js';
import tenantRouter from './routes/tenant.routes.js';
import superadminRouter from './routes/superadmin.routes.js';
import superadminSubscriptionRouter from './routes/superadmin/subscription.routes.js';
import superadminBillingRouter from './routes/superadmin/billing.routes.js';
import superadminModuleRouter from './routes/superadmin/module.routes.js'; // ✅ NOVO
import regulatoryRouter from './routes/regulatory.routes.js';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import customerRouter from './routes/customer.routes.js';
import supplierRouter from './routes/supplier.routes.js';
import invoiceRouter from './routes/invoice.routes.js';
import fiscalRouter from './routes/fiscal.routes.js';
// import limitsRouter from './routes/limits.routes.js';
// import globalPaymentConfigRouter from './routes/globalPaymentConfig.routes.js';
// import paymentGatewayCredentialsRouter from './routes/paymentGatewayCredentials.routes.js';
// import paymentGatewayEventsRouter from './routes/paymentGatewayEvents.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import usageRouter from './routes/usage.routes.js';
import paymentRouter from './routes/payment.routes.js';
import webhookRouter from './routes/webhook.routes.js';
import paymentGatewayRouter from './routes/payment-gateway.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import batchRouter from './routes/batch.routes.js';
import tenantBillingRouter from './routes/tenant-billing.routes.js';
import docsRouter from './routes/docs.routes.js';
import backupRouter from './routes/backup.routes.js';
import tenantSettingsRoutes from './routes/tenant-settings.routes.js';
import financialRoutes from './routes/financial.routes.js';
import auditRoutes from './routes/audit.routes.js';
import orderRouter from './routes/order.routes.js';
import warehouseRouter from './routes/warehouse.routes.js';
import temperatureRouter from './routes/temperature.routes.js';
import quoteRouter from './routes/quote.routes.js';
import nfceRouter from './routes/nfce.routes.js';
import deliveryRouteRouter from './routes/delivery-route.routes.js';
import { authenticateToken } from './middleware/auth.js';
import { validateSubscription, validateModule } from './middleware/subscription.middleware.js';
import { initPaymentSyncJob, paymentSyncJob } from './jobs/paymentSync.job.js';
import { initBackupCleanupJob, backupCleanupJob } from './jobs/backupCleanup.job.js';

const app: Application = express();

// Trust proxy (para setups atrás de reverse proxy / load balancer)
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      mediaSrc: ["'self'", "data:", "https:", "http:", "blob:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate limiting - Geral
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Login (mais restritivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
});

// Disable login limiter outside production or when running Vitest to avoid throttling automated suites
const authLimiterMiddleware = (config.NODE_ENV === 'production' && process.env.VITEST !== 'true' && process.env.NODE_ENV !== 'test')
  ? authLimiter
  : ((req, _res, next) => next());

// Middlewares globais
app.use(limiter);

// CORS - Permitir requests locais e de produção
app.use(cors({
  origin: (origin, callback) => {
    // Sempre permitir se for localhost ou sem origin (mobile apps)
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('5173') || origin.includes('3000')) {
      callback(null, true);
    }
    // Em produção, verificar origens configuradas
    else if ((config.CORS_ORIGINS || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
      .includes(origin)) {
      callback(null, true);
    }
    // Origens padrão de produção
    else if (['https://medmanager.com', 'https://app.medmanager.com'].includes(origin)) {
      callback(null, true);
    }
    // Tudo else é rejeitado
    else if (config.isDevelopment) {
      callback(null, true); // Em dev, aceitar tudo
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-webhook-token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para arquivos estáticos com CORS
app.use('/static', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Static files (logos e avatars) - SEM AUTENTICAÇÃO
app.use('/static/logos', express.static(path.join(process.cwd(), 'uploads', 'logos')));
app.use('/static/avatars', express.static(path.join(process.cwd(), 'uploads', 'avatars')));
app.use('/static/docs', express.static(path.join(process.cwd(), 'uploads', 'docs')));

// Middleware de tenant (deve vir antes das rotas) - SKIP para rotas estáticas
app.use((req, res, next) => {
  console.log(`[GLOBAL-LOG] ${req.method} ${req.path}`, {
    idHeader: req.headers['x-tenant-id'],
    auth: !!req.headers.authorization
  });

  if (req.path.startsWith('/static/')) {
    return next();
  }
  return optionalTenantMiddleware(req, res, next);
});

// Rate limiting por Tenant (após identificar o tenant)
app.use(tenantRateLimit);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Rotas da API
app.use(`/api/${config.API_VERSION}/auth`, authLimiterMiddleware, authRouter);
app.use(`/api/${config.API_VERSION}/tenants`, tenantRouter);

// Protected routes (require authentication)
// Rotas de assinatura (informações de assinatura) - precisam de autenticação e tenant, mas NÃO bloqueiam por expiração
// Rotas de assinatura (informações e uso) não devem ser bloqueadas por expiração
app.use(`/api/${config.API_VERSION}/subscriptions`, authenticateToken, tenantMiddleware, subscriptionRouter);
app.use(`/api/${config.API_VERSION}/usage`, authenticateToken, tenantMiddleware, usageRouter);
app.use(`/api/${config.API_VERSION}/payments`, authenticateToken, tenantMiddleware, paymentRouter);
app.use(`/api/${config.API_VERSION}/payment-gateways`, authenticateToken, tenantMiddleware, paymentGatewayRouter);
app.use(`/api/${config.API_VERSION}/tenant/billing`, tenantBillingRouter);
app.use(`/api/${config.API_VERSION}/tenant/settings`, authenticateToken, tenantMiddleware, tenantSettingsRoutes);
app.use(`/api/${config.API_VERSION}/financial`, authenticateToken, tenantMiddleware, validateSubscription, financialRoutes);
app.use(`/api/${config.API_VERSION}/audit`, authenticateToken, tenantMiddleware, validateSubscription, auditRoutes);
app.use(`/api/${config.API_VERSION}/webhooks`, webhookRouter);
app.use(`/api/${config.API_VERSION}/docs`, authenticateToken, tenantMiddleware, docsRouter);
app.use(`/api/${config.API_VERSION}/backup`, authenticateToken, backupRouter);
app.use(`/api/${config.API_VERSION}/nfce`, nfceRouter);

// Rotas protegidas que exigem assinatura ativa
app.use(`/api/${config.API_VERSION}/superadmin`, authenticateToken, superadminRouter);
app.use(`/api/${config.API_VERSION}/superadmin/subscriptions`, authenticateToken, superadminSubscriptionRouter);
app.use(`/api/${config.API_VERSION}/superadmin/subscriptions`, authenticateToken, superadminSubscriptionRouter);
app.use(`/api/${config.API_VERSION}/superadmin/billing`, authenticateToken, superadminBillingRouter);
app.use(`/api/${config.API_VERSION}/superadmin/modules`, authenticateToken, superadminModuleRouter); // ✅ NOVO
// app.use(`/api/${config.API_VERSION}/limits`, limitsRouter);
app.use(`/api/${config.API_VERSION}/regulatory`, authenticateToken, tenantMiddleware, validateSubscription, regulatoryRouter);
app.use(`/api/${config.API_VERSION}/users`, authenticateToken, validateSubscription, userRouter);
app.use(`/api/${config.API_VERSION}/products`, authenticateToken, tenantMiddleware, validateSubscription, productRouter);
app.use(`/api/${config.API_VERSION}/inventory`, authenticateToken, tenantMiddleware, validateSubscription, inventoryRouter);
app.use(`/api/${config.API_VERSION}/customers`, authenticateToken, tenantMiddleware, validateSubscription, customerRouter);
app.use(`/api/${config.API_VERSION}/suppliers`, authenticateToken, tenantMiddleware, validateSubscription, supplierRouter);
app.use(`/api/${config.API_VERSION}/invoices`, authenticateToken, tenantMiddleware, validateSubscription, invoiceRouter);
app.use(`/api/${config.API_VERSION}/fiscal`, authenticateToken, tenantMiddleware, validateSubscription, fiscalRouter);
app.use(`/api/${config.API_VERSION}/dashboard`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('DASHBOARD'), dashboardRouter);
app.use(`/api/${config.API_VERSION}/batches`, authenticateToken, tenantMiddleware, validateSubscription, batchRouter);
app.use(`/api/${config.API_VERSION}/orders`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('ORDERS'), orderRouter);
app.use(`/api/${config.API_VERSION}/warehouses`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('WAREHOUSE'), warehouseRouter);
app.use(`/api/${config.API_VERSION}/temperature`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('WAREHOUSE'), temperatureRouter);
app.use(`/api/${config.API_VERSION}/quotes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('QUOTES'), quoteRouter);
app.use(`/api/${config.API_VERSION}/delivery-routes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('DELIVERY'), deliveryRouteRouter);

// Rota de teste
app.get('/api/test', (req, res) => {
  console.log('[TEST ROUTE] Rota /api/test chamada');
  res.json({
    message: 'MedManager API is working!',
    tenant: req.tenant || 'no-tenant',
    timestamp: new Date().toISOString()
  });
});

// Rota de teste COM validateSubscription
app.get('/api/test-subscription', authenticateToken, tenantMiddleware, validateSubscription, (req, res) => {
  console.log('[TEST SUBSCRIPTION ROUTE] Rota /api/test-subscription chamada');
  res.json({
    message: 'Subscription is valid!',
    tenant: req.tenant || 'no-tenant',
    timestamp: new Date().toISOString()
  });
});

// Middleware de erro (deve ser o último)
app.use(errorHandler);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = config.PORT || 3333;

// Initialize admin user on startup
initializeAdminUser().catch(error => {
  logger.error('Failed to initialize admin user:', error instanceof Error ? error.message : String(error));
  // Continue even if initialization fails
});

import { createServer } from 'http';
import { socketService } from './services/socket.service.js';

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  logger.info(`🚀 MedManager API running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.NODE_ENV}`);
  logger.info(`🔐 Rate limiting: ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${config.RATE_LIMIT_WINDOW_MS}ms`);

  // Inicializa Socket.io
  socketService.initialize(httpServer);

  // Inicializa cron de sincronização de cobranças (se habilitado via env)
  initPaymentSyncJob();
  // Inicializa job automático de limpeza de backups (se habilitado via env)
  initBackupCleanupJob();
});

// Rotas de status de crons
app.get(`/api/${config.API_VERSION}/system/cron/payments/status`, (req, res) => {
  res.json({ success: true, job: paymentSyncJob.getStatus() });
});

app.get(`/api/${config.API_VERSION}/system/cron/backups/status`, (req, res) => {
  res.json({ success: true, job: backupCleanupJob.getStatus() });
});

// Logs recentes do cron de pagamentos
app.get(`/api/${config.API_VERSION}/system/cron/payments/logs`, (req, res) => {
  const limit = Number((req.query.limit as string) || '100');
  const levelFilter = (req.query.level as string) || '';
  let logs = paymentSyncJob.getLogs(limit);
  if (levelFilter) {
    logs = logs.filter(l => l.level === levelFilter);
  }
  res.json({ success: true, logs });
});

// Download arquivo diário de logs do cron de pagamentos
app.get(`/api/${config.API_VERSION}/system/cron/payments/logs/file`, (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  const pathLib = require('path');
  const fs = require('fs');
  const filePath = pathLib.join(process.cwd(), 'logs', `payment-sync-${date}.log`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Log file not found for date', date });
  }
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=payment-sync-${date}.log`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

export default app;