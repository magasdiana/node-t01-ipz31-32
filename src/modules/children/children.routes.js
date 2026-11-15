import { Router } from "express";
import { childrenController } from "./children.controller.js";
import { validate } from "../../middleware/validate.js";
import { parentScope } from "../../middleware/parentScope.js";
import {
  createChildValidation,
  updateChildValidation,
  getOrDeleteChildValidation,
} from "./children.schema.js";

const router = Router();

router.get("/", childrenController.list);
router.get(
  "/:id",
  validate(getOrDeleteChildValidation),
  parentScope.childParam(),
  childrenController.getById,
);
router.post("/", validate(createChildValidation), childrenController.create);
// гард ДО validate: zod відкидає невідомі поля, і 403 за ними вже не спрацював би
router.patch(
  "/:id",
  parentScope.patchChild,
  validate(updateChildValidation),
  childrenController.update,
);
router.delete(
  "/:id",
  validate(getOrDeleteChildValidation),
  childrenController.delete,
);

export default router;
