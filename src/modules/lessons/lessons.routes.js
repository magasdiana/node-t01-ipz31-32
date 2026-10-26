import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { lessonsController } from "./lessons.controller.js";
import { groupLessonsSchema, updateLessonSchema } from "./lessons.schema.js";

// Роутер змонтований з кореня (app.use("/", lessonsRoutes)),
// бо містить маршрути двох ресурсів: /groups/:id/lessons і /lessons/:id
const router = Router();

router.get(
  "/groups/:id/lessons",
  validate(groupLessonsSchema),
  lessonsController.listByGroup,
);

router.patch(
  "/lessons/:id",
  validate(updateLessonSchema),
  lessonsController.update,
);

export default router;
