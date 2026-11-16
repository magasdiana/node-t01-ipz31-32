import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import { groupsController } from "./groups.controller.js";
import {
  createGroupValidation,
  updateGroupValidation,
  getOrDeleteGroupValidation,
} from "./groups.schema.js";

const router = Router();

router.get("/", authorize(ACCESS.GROUPS_READ), groupsController.list);
router.get("/:id", authorize(ACCESS.GROUPS_READ), validate(getOrDeleteGroupValidation), groupsController.getById);
router.post("/", authorize(ACCESS.GROUPS_WRITE), validate(createGroupValidation), groupsController.create);
router.patch("/:id", authorize(ACCESS.GROUPS_WRITE), validate(updateGroupValidation), groupsController.update);
router.delete("/:id", authorize(ACCESS.GROUPS_DELETE), validate(getOrDeleteGroupValidation), groupsController.delete);

export default router;
