import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { roomsController } from "./rooms.controller.js";
import {
  createRoomValidation,
  updateRoomValidation,
  getOrDeleteRoomValidation,
} from "./rooms.schema.js";

const router = Router();

router.get("/", roomsController.list);
router.get("/:id", validate(getOrDeleteRoomValidation), roomsController.getById);
router.post("/", validate(createRoomValidation), roomsController.create);
router.patch("/:id", validate(updateRoomValidation), roomsController.update);
router.delete("/:id", validate(getOrDeleteRoomValidation), roomsController.delete);

export default router;