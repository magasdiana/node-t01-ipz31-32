import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { validate } from '../../middleware/validate.js';
import {
  createPaymentValidation,
  getPaymentsValidation,
  getOrDeletePaymentValidation,
} from './payments.schema.js';

const router = Router();

router.get('/', validate(getPaymentsValidation), paymentsController.list);
router.get('/:id', validate(getOrDeletePaymentValidation), paymentsController.getById);
router.post('/', validate(createPaymentValidation), paymentsController.create);
router.delete('/:id', validate(getOrDeletePaymentValidation), paymentsController.delete);

export default router;