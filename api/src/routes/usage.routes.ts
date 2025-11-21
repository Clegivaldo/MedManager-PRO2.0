import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller.js';

const router: Router = Router();

router.get('/current', (req, res, next) => UsageController.getCurrent(req, res, next));

export default router;
