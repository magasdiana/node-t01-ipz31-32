import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import { loginValidation } from "./auth.schema.js";

export function createAuthRouter(controller = authController) {
  const router = Router();

  // Публічний маршрут: монтується в app.js до authenticate
  router.post("/login", validate(loginValidation), controller.login);

  return router;
}

export default createAuthRouter();
