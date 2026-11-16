
import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { validate } from '../../middleware/validate.js';
import { authorize } from '../../middleware/auth.js';
import { ACCESS } from '../../config/access.js';

import {
  getProfitSchema,
  getMinRoomsSchema,
  getForecastProfitSchema,
} from './reports.schema.js';

const router = Router();

router.get(
  '/forecast-profit',
  authorize(ACCESS.REPORTS),
  validate(getForecastProfitSchema),
  reportsController.getForecastProfit
);

router.get(
  '/profit',
  authorize(ACCESS.REPORTS),
  validate(getProfitSchema),
  reportsController.getProfit
);

router.get(
  '/min-rooms',
  authorize(ACCESS.REPORTS),
  validate(getMinRoomsSchema),
  reportsController.getMinRooms
);

export default router;
