import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import { roomsController } from "./rooms.controller.js";
import {
  createRoomValidation,
  updateRoomValidation,
  getOrDeleteRoomValidation,
} from "./rooms.schema.js";

const router = Router();

router.get("/", authorize(ACCESS.ROOMS_READ), roomsController.list);
router.get("/:id", authorize(ACCESS.ROOMS_READ), validate(getOrDeleteRoomValidation), roomsController.getById);
router.post("/", authorize(ACCESS.ROOMS_WRITE), validate(createRoomValidation), roomsController.create);
router.patch("/:id", authorize(ACCESS.ROOMS_WRITE), validate(updateRoomValidation), roomsController.update);
router.delete("/:id", authorize(ACCESS.ROOMS_WRITE), validate(getOrDeleteRoomValidation), roomsController.delete);

export default router;
