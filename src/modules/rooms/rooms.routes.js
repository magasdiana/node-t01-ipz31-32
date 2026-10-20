import { Router } from "express";
import { roomsController } from "./rooms.controller.js";

const router = Router();

router.get("/", roomsController.list);
router.get("/:id", roomsController.getById);
router.post("/", roomsController.create);
router.patch("/:id", roomsController.update);
router.delete("/:id", roomsController.delete);

export default router;
