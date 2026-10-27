import { Router } from 'express';
import { pricingController } from './pricing.controller.js';
import { validate } from '../../middleware/validate.js';
import { getInvoiceValidation, updatePricesSchema } from './pricing.schema.js';

const router = Router();

// Пункт 4: інвойс для дитини (з валідацією params.id та query.period)
router.get('/children/:id/invoice', validate(getInvoiceValidation), pricingController.getInvoice);

// Пункт 5: налаштування цін та історія
router.get('/settings/prices', pricingController.getPrices);
router.put('/settings/prices', validate(updatePricesSchema), pricingController.updatePrices);
router.get('/settings/prices/history', pricingController.getHistory);

export default router;