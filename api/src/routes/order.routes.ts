import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';

const router: Router = Router();
const controller = new OrderController();

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
