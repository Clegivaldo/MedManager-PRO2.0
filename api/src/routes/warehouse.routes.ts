import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller.js';

const router: Router = Router();
const controller = new WarehouseController();

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
