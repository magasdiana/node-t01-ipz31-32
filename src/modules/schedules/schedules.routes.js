import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import {
  generateScheduleSchema,
  forecastScheduleSchema,
} from "./schedules.schema.js";
import * as controller from "./schedules.controller.js";

const router = Router();

router.post(
  "/",
  authorize(ACCESS.SCHEDULES_GENERATE),
  validate(generateScheduleSchema),
  controller.generate,
);

router.get(
  "/forecast",
  authorize(ACCESS.SCHEDULES_FORECAST),
  validate(forecastScheduleSchema),
  controller.forecast,
);

export default router;