import { Router } from 'express';
import { DeliveryRouteController } from '../controllers/delivery-route.controller.js';

const router: Router = Router();
const controller = new DeliveryRouteController();

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.put('/:id/stops/:stopId/complete', controller.completeStop.bind(controller));

export default router;
