import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenantMiddleware.js';
import authRouter from './routes/auth.routes.js';
import tenantRouter from './routes/tenant.routes.js';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS),
  max: parseInt(config.RATE_LIMIT_MAX_REQUESTS),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(config.RATE_LIMIT_WINDOW_MS) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares globais
app.use(limiter);
app.use(cors({
  origin: config.NODE_ENV === 'production' 
    ? ['https://medmanager.com', 'https://app.medmanager.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de tenant (deve vir antes das rotas)
// Usar middleware opcional para rotas públicas e obrigatório para rotas protegidas
app.use(optionalTenantMiddleware);

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
app.use(`/api/${config.API_VERSION}/auth`, authRouter);
app.use(`/api/${config.API_VERSION}/tenants`, tenantRouter);

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