import { Router } from 'express';
import { tenantSettingsController } from '../controllers/tenant-settings.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Buscar configurações
router.get('/', tenantSettingsController.getSettings);

// Atualizar configurações
router.put('/', tenantSettingsController.updateSettings);

// Upload de logo
router.post('/logo', upload.single('logo'), tenantSettingsController.uploadLogo);

// Upload de certificado digital
router.post(
    '/certificate',
    upload.single('certificate'),
    tenantSettingsController.uploadCertificate
);

export default router;
