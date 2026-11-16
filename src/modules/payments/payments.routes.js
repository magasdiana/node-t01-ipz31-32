import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ACCESS } from '../../config/access.js';
import {
  createPaymentValidation,
  getPaymentsValidation,
  getOrDeletePaymentValidation,
} from './payments.schema.js';

const router = Router();

router.get('/', authorize(ACCESS.PAYMENTS_READ), validate(getPaymentsValidation), paymentsController.list);
router.get('/:id', authorize(ACCESS.PAYMENTS_READ), validate(getOrDeletePaymentValidation), paymentsController.getById);
router.post('/', authorize(ACCESS.PAYMENTS_CREATE), validate(createPaymentValidation), paymentsController.create);
router.delete('/:id', authorize(ACCESS.PAYMENTS_DELETE), validate(getOrDeletePaymentValidation), paymentsController.delete);

export default router;
