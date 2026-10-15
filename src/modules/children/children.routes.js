import { Router } from "express";
import { childrenController } from "./children.controller.js";

const router = Router();

router.get("/", childrenController.list);
router.get("/:id", childrenController.getById);
router.post("/", childrenController.create);
router.patch("/:id", childrenController.update);
router.delete("/:id", childrenController.delete);

export default router;
