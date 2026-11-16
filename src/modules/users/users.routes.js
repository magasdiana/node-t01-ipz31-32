import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import { usersController } from "./users.controller.js";
import { createUserValidation, getUserValidation } from "./users.schema.js";

export function createUsersRouter(controller = usersController) {
  const router = Router();

  // Керування користувачами: лише Admin (authenticate стоїть в app.js)
  router.use(authorize(ACCESS.USERS));

  router.get("/", controller.list);
  router.get("/:id", validate(getUserValidation), controller.getById);
  router.post("/", validate(createUserValidation), controller.create);

  return router;
}

export default createUsersRouter();
