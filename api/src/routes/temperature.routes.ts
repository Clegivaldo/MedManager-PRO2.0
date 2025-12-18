import { Router } from 'express';
import { TemperatureController } from '../controllers/temperature.controller.js';

const router: Router = Router();
const controller = new TemperatureController();

router.post('/', controller.record.bind(controller));
router.get('/latest', controller.getLatest.bind(controller));
router.get('/warehouse/:warehouseId', controller.getHistory.bind(controller));
router.get('/alerts', controller.getAlerts.bind(controller));

export default router;
