import { asyncHandler } from "../../lib/asyncHandler.js";
import { BadRequestError } from "../../lib/errors.js";
import { roomsService } from "./rooms.service.js";
import {
  roomCreateSchema,
  roomUpdateSchema,
  roomIdSchema,
} from "./rooms.schema.js";

function parseId(value) {
  const result = roomIdSchema.safeParse(value);

  if (!result.success) {
    throw new BadRequestError("Некоректний id кімнати");
  }

  return result.data;
}

function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestError("Помилка валідації", result.error.issues);
  }

  return result.data;
}

export const roomsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await roomsService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    res.json(await roomsService.getById(parseId(req.params.id)));
  }),

  create: asyncHandler(async (req, res) => {
    const input = validateBody(roomCreateSchema, req.body);

    res.status(201).json(await roomsService.create(input));
  }),

  update: asyncHandler(async (req, res) => {
    const input = validateBody(roomUpdateSchema, req.body);

    res.json(
      await roomsService.update(parseId(req.params.id), input),
    );
  }),

  delete: asyncHandler(async (req, res) => {
    res.json(await roomsService.delete(parseId(req.params.id)));
  }),
};
