import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { validate } from '../../middleware/validate.js';
import { createPaymentSchema, getPaymentsQuerySchema } from './payments.schema.js';

const router = Router();

router.post('/', validate(createPaymentSchema), paymentsController.create);
router.get('/', validate(getPaymentsQuerySchema, 'query'), paymentsController.list);

export default router;