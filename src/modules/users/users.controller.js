import { asyncHandler } from "../../lib/asyncHandler.js";
import { hashPassword } from "../../lib/password.js";
import { usersRepository } from "./users.repository.js";
import { createUsersService } from "./users.service.js";

export function createUsersController(service) {
  return {
    list: asyncHandler(async (_req, res) => {
      res.json(await service.list());
    }),

    getById: asyncHandler(async (req, res) => {
      res.json(await service.getById(req.validated.params.id));
    }),

    create: asyncHandler(async (req, res) => {
      res.status(201).json(await service.create(req.validated.body));
    }),
  };
}

export const usersService = createUsersService({
  usersRepository,
  hashPassword,
});

export const usersController = createUsersController(usersService);
