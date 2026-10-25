import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { validate } from '../../middleware/validate.js';
import { getProfitSchema, getMinRoomsSchema } from './reports.schema.js';

const router = Router();

router.get('/profit', validate(getProfitSchema), reportsController.getProfit);
router.get('/min-rooms', validate(getMinRoomsSchema), reportsController.getMinRooms);

export default router;