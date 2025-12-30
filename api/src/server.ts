import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection, getCsrfToken } from './middleware/csrf.js';
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
import guia33Router from './routes/guia33.routes.js';
import controlledDispensationRouter from './routes/controlled-dispensation.routes.js';
import sngpcConfigRouter from './routes/sngpc-config.routes.js';
import tenantSettingsRoutes from './routes/tenant-settings.routes.js';
import financialRoutes from './routes/financial.routes.js';
import auditRoutes from './routes/audit.routes.js';
import orderRouter from './routes/order.routes.js';
import warehouseRouter from './routes/warehouse.routes.js';
import temperatureRouter from './routes/temperature.routes.js';
import quoteRouter from './routes/quote.routes.js';
import nfceRouter from './routes/nfce.routes.js';
import nfeRouter from './routes/nfe.routes.js';
import complianceRouter from './routes/compliance.routes.js';
import deliveryRouteRouter from './routes/delivery-route.routes.js';
import systemRouter from './routes/system.routes.js';
import { authenticateToken } from './middleware/auth.js';
import { validateSubscription, validateModule } from './middleware/subscription.middleware.js';
import { initPaymentSyncJob } from './jobs/paymentSync.job.js';
import { initBackupCleanupJob } from './jobs/backupCleanup.job.js';
import { initTenantBackupJob } from './jobs/tenantBackup.job.js';
import { requireSuperAdmin } from './middleware/rbac.js';

const app: Application = express();

// Trust proxy (para setups atrás de reverse proxy / load balancer)
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      // ✅ SEGURANÇA: Removido 'unsafe-inline' - use nonces ou hashes para estilos inline
      styleSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      mediaSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      // Proteções adicionais
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      scriptSrcAttr: ["'none'"],
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
  // Proteção adicional contra MIME sniffing
  noSniff: true,
  // Previne XSS em navegadores antigos
  xssFilter: true,
  // Esconde informação do servidor
  hidePoweredBy: true,
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
  skip: (req) => req.method === 'OPTIONS', // NÃO aplicar rate limit em OPTIONS
});

// Rate limiting - Login (mais restritivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS', // NÃO aplicar rate limit em OPTIONS
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
  exposedHeaders: ['Content-Length'],
  optionsSuccessStatus: 200,
}));

// CORS preflight handler
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Proteção CSRF (aplicada em rotas mutáveis)
// Skip para GET, HEAD, OPTIONS e webhooks
if (config.NODE_ENV === 'production') {
  app.use(csrfProtection);
}

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
// Middleware de tenant (deve vir antes das rotas) - SKIP para rotas estáticas
app.use(async (req, res, next) => {
  if (req.path.startsWith('/static/')) {
    return next();
  }
  
  // Call optionalTenantMiddleware and AWAIT it
  await optionalTenantMiddleware(req, res, next);
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

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

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
app.use(`/api/${config.API_VERSION}/guia33`, authenticateToken, tenantMiddleware, validateSubscription, guia33Router);
app.use(`/api/${config.API_VERSION}/controlled-dispensation`, authenticateToken, tenantMiddleware, validateSubscription, controlledDispensationRouter);
app.use(`/api/${config.API_VERSION}/sngpc`, authenticateToken, tenantMiddleware, validateSubscription, sngpcConfigRouter);
app.use(`/api/${config.API_VERSION}/nfce`, nfceRouter);
app.use(`/api/${config.API_VERSION}/nfe`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('NFE'), nfeRouter);
app.use(`/api/${config.API_VERSION}/compliance`, authenticateToken, tenantMiddleware, validateSubscription, complianceRouter);
app.use(`/api/${config.API_VERSION}/system`, systemRouter);

// Rotas protegidas que exigem assinatura ativa
app.use(`/api/${config.API_VERSION}/superadmin`, authenticateToken, superadminRouter);
app.use(`/api/${config.API_VERSION}/superadmin/subscriptions`, authenticateToken, superadminSubscriptionRouter);
app.use(`/api/${config.API_VERSION}/superadmin/subscriptions`, authenticateToken, superadminSubscriptionRouter);
app.use(`/api/${config.API_VERSION}/superadmin/billing`, authenticateToken, superadminBillingRouter);
app.use(`/api/${config.API_VERSION}/superadmin/modules`, authenticateToken, superadminModuleRouter); // ✅ NOVO
// app.use(`/api/${config.API_VERSION}/limits`, limitsRouter);
app.use(`/api/${config.API_VERSION}/regulatory`, authenticateToken, tenantMiddleware, validateSubscription, regulatoryRouter);
app.use(`/api/${config.API_VERSION}/users`, authenticateToken, tenantMiddleware, validateSubscription, userRouter);
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
app.use(`/api/${config.API_VERSION}/temperature`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('INVENTORY'), temperatureRouter);
app.use(`/api/${config.API_VERSION}/quotes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('QUOTES'), quoteRouter);
app.use(`/api/${config.API_VERSION}/delivery-routes`, authenticateToken, tenantMiddleware, validateSubscription, validateModule('DELIVERY'), deliveryRouteRouter);

// Cron routes moved to routes/system.routes.ts and mounted above

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
  // ✅ Inicializa job automático de backup diário de tenants
  initTenantBackupJob();
});

// (moved up) cron routes are defined above

export default app;