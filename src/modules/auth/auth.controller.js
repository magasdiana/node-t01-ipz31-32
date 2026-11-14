import { asyncHandler } from "../../lib/asyncHandler.js";
import { burnPasswordCheck, verifyPassword } from "../../lib/password.js";
import { signToken } from "../../lib/jwt.js";
import { usersRepository } from "../users/users.repository.js";
import { createAuthService } from "./auth.service.js";

export function createAuthController(service) {
  return {
    login: asyncHandler(async (req, res) => {
      res.json(await service.login(req.validated.body));
    }),
  };
}

export const authService = createAuthService({
  usersRepository,
  verifyPassword,
  burnPasswordCheck,
  signToken,
});

export const authController = createAuthController(authService);
