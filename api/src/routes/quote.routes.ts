import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller.js';

const router: Router = Router();
const controller = new QuoteController();

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.post('/:id/approve', controller.approve.bind(controller));
router.delete('/:id', controller.delete.bind(controller));

export default router;
