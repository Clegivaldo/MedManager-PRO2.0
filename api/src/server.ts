import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenantMiddleware.js';
import authRouter from './routes/auth.routes.js';
import tenantRouter from './routes/tenant.routes.js';
import superadminRouter from './routes/superadmin.routes.js';
import regulatoryRouter from './routes/regulatory.routes.js';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import customerRouter from './routes/customer.routes.js';
import supplierRouter from './routes/supplier.routes.js';
import invoiceRouter from './routes/invoice.routes.js';
import fiscalRouter from './routes/fiscal.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import batchRouter from './routes/batch.routes.js';
import { authenticateToken } from './middleware/auth.js';

const app: Application = express();

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

// Middlewares globais
app.use(limiter);
app.use(cors({
  origin: config.NODE_ENV === 'production' 
    ? ['https://medmanager.com', 'https://app.medmanager.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
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

// Middleware de tenant (deve vir antes das rotas) - SKIP para rotas estáticas
app.use((req, res, next) => {
  if (req.path.startsWith('/static/')) {
    return next();
  }
  return optionalTenantMiddleware(req, res, next);
});

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
app.use(`/api/${config.API_VERSION}/auth`, authLimiter, authRouter);
app.use(`/api/${config.API_VERSION}/tenants`, tenantRouter);

// Protected routes (require authentication)
app.use(`/api/${config.API_VERSION}/superadmin`, authenticateToken, superadminRouter);
app.use(`/api/${config.API_VERSION}/regulatory`, authenticateToken, tenantMiddleware, regulatoryRouter);
app.use(`/api/${config.API_VERSION}/users`, authenticateToken, userRouter);
app.use(`/api/${config.API_VERSION}/products`, authenticateToken, tenantMiddleware, productRouter);
app.use(`/api/${config.API_VERSION}/inventory`, authenticateToken, tenantMiddleware, inventoryRouter);
app.use(`/api/${config.API_VERSION}/customers`, authenticateToken, tenantMiddleware, customerRouter);
app.use(`/api/${config.API_VERSION}/suppliers`, authenticateToken, tenantMiddleware, supplierRouter);
app.use(`/api/${config.API_VERSION}/invoices`, authenticateToken, tenantMiddleware, invoiceRouter);
app.use(`/api/${config.API_VERSION}/fiscal`, authenticateToken, tenantMiddleware, fiscalRouter);
app.use(`/api/${config.API_VERSION}/dashboard`, authenticateToken, tenantMiddleware, dashboardRouter);
app.use(`/api/${config.API_VERSION}/batches`, authenticateToken, tenantMiddleware, batchRouter);

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({
    message: 'MedManager API is working!',
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

app.listen(PORT, () => {
  logger.info(`🚀 MedManager API running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.NODE_ENV}`);
  logger.info(`🔐 Rate limiting: ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${config.RATE_LIMIT_WINDOW_MS}ms`);
});

export default app;