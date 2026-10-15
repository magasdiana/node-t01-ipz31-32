import { Router } from "express";
import { groupsController } from "./groups.controller.js";

const router = Router();

router.get("/", groupsController.list);
router.get("/:id", groupsController.getById);
router.post("/", groupsController.create);
router.patch("/:id", groupsController.update);
router.delete("/:id", groupsController.delete);

export default router;
