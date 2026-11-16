import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import { generateScheduleSchema } from "./schedules.schema.js";
import * as controller from "./schedules.controller.js";

const router = Router();

router.post("/", authorize(ACCESS.SCHEDULES_GENERATE), validate(generateScheduleSchema), controller.generate);

export default router;
