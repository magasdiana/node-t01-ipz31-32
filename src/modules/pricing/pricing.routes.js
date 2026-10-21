import { Router } from 'express';
import { pricingController } from './pricing.controller.js';
import { validate } from '../../middleware/validate.js';
import { updatePricesSchema } from './pricing.schema.js';

const router = Router();

router.get('/settings/prices', pricingController.getPrices);
router.put('/settings/prices', validate(updatePricesSchema), pricingController.updatePrices);
router.get('/settings/prices/history', pricingController.getHistory);

export default router;