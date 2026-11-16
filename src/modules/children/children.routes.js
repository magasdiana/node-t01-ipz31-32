import { Router } from "express";
import { childrenController } from "./children.controller.js";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import {
    createChildValidation,
    updateChildValidation,
    getOrDeleteChildValidation,
} from "./children.schema.js";

const router = Router();

router.get("/", authorize(ACCESS.CHILDREN_READ), childrenController.list);
router.get("/:id", authorize(ACCESS.CHILDREN_READ), validate(getOrDeleteChildValidation), childrenController.getById);
router.post("/", authorize(ACCESS.CHILDREN_CREATE), validate(createChildValidation), childrenController.create);
router.patch("/:id", authorize(ACCESS.CHILDREN_UPDATE), validate(updateChildValidation), childrenController.update);
router.delete("/:id", authorize(ACCESS.CHILDREN_DELETE), validate(getOrDeleteChildValidation), childrenController.delete);

export default router;
