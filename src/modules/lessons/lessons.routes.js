import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ownLesson } from "../../middleware/teacherOwnership.js";
import { ACCESS } from "../../config/access.js";
import { lessonsController } from "./lessons.controller.js";
import { groupLessonsSchema, updateLessonSchema } from "./lessons.schema.js";

// Роутер змонтований з кореня (app.use("/", lessonsRoutes)),
// бо містить маршрути двох ресурсів: /groups/:id/lessons і /lessons/:id
const router = Router();

// Parent бачить лише групу своєї дитини (фільтр у PR Дениса)
router.get(
  "/groups/:id/lessons",
  authorize(ACCESS.GROUP_LESSONS),
  validate(groupLessonsSchema),
  lessonsController.listByGroup,
);

// Teacher змінює лише власні заняття (lessons.staff_id -> staff.user_id)
router.patch(
  "/lessons/:id",
  authorize(ACCESS.LESSON_UPDATE),
  validate(updateLessonSchema),
  ownLesson,
  lessonsController.update,
);

export default router;
