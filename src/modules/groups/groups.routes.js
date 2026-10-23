import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { groupsController } from "./groups.controller.js";
import {
  createGroupValidation,
  updateGroupValidation,
  getOrDeleteGroupValidation,
} from "./groups.schema.js";

const router = Router();

router.get("/", groupsController.list);
router.get("/:id", validate(getOrDeleteGroupValidation), groupsController.getById);
router.post("/", validate(createGroupValidation), groupsController.create);
router.patch("/:id", validate(updateGroupValidation), groupsController.update);
router.delete("/:id", validate(getOrDeleteGroupValidation), groupsController.delete);

export default router;