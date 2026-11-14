
import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ROLES } from '../../config/roles.js';

import {
  getProfitSchema,
  getMinRoomsSchema,
  getForecastProfitSchema,
} from './reports.schema.js';

const router = Router();

router.get(
  '/forecast-profit',
  authorize(ROLES.ADMIN),
  validate(getForecastProfitSchema),
  reportsController.getForecastProfit
);

router.get(
  '/profit',
  validate(getProfitSchema),
  reportsController.getProfit
);

router.get(
  '/min-rooms',
  validate(getMinRoomsSchema),
  reportsController.getMinRooms
);

export default router;
