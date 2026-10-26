import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { generateScheduleSchema } from "./schedules.schema.js";
import * as controller from "./schedules.controller.js";

const router = Router();

router.post("/", validate(generateScheduleSchema), controller.generate);

export default router;
