import { Router } from "express";
import { childrenController } from "./children.controller.js";
import { validate } from "../../middleware/validate.js";
import {
    createChildValidation,
    updateChildValidation,
    getOrDeleteChildValidation,
} from "./children.schema.js";

const router = Router();

router.get("/", childrenController.list);
router.get("/:id", validate(getOrDeleteChildValidation), childrenController.getById);
router.post("/", validate(createChildValidation), childrenController.create);
router.patch("/:id", validate(updateChildValidation), childrenController.update);
router.delete("/:id", validate(getOrDeleteChildValidation), childrenController.delete);

export default router;