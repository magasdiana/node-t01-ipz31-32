import { Router } from 'express';
import { pricingController } from './pricing.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ACCESS } from '../../config/access.js';
import { parentScope } from '../../middleware/parentScope.js';
import { getInvoiceValidation, updatePricesSchema } from './pricing.schema.js';

const router = Router();

// Пункт 4: інвойс для дитини (з валідацією params.id та query.period).
// Parent бачить лише рахунок своєї дитини (parentScope)
router.get(
  '/children/:id/invoice',
  authorize(ACCESS.CHILDREN_INVOICE),
  validate(getInvoiceValidation),
  parentScope.childParam(),
  pricingController.getInvoice,
);

// Пункт 5: налаштування цін та історія (лише Admin)
router.get('/settings/prices', authorize(ACCESS.PRICES), pricingController.getPrices);
router.put('/settings/prices', authorize(ACCESS.PRICES), validate(updatePricesSchema), pricingController.updatePrices);
router.get('/settings/prices/history', authorize(ACCESS.PRICES), pricingController.getHistory);

export default router;