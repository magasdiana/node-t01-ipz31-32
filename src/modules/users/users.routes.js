import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ROLES } from "../../config/roles.js";
import { usersController } from "./users.controller.js";
import { createUserValidation, getUserValidation } from "./users.schema.js";

export function createUsersRouter(controller = usersController) {
  const router = Router();

  // Керування користувачами: лише Admin (authenticate стоїть в app.js)
  router.use(authorize(ROLES.ADMIN));

  router.get("/", controller.list);
  router.get("/:id", validate(getUserValidation), controller.getById);
  router.post("/", validate(createUserValidation), controller.create);

  return router;
}

export default createUsersRouter();
