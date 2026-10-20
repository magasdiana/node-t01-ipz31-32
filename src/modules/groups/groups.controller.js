import { asyncHandler } from "../../lib/asyncHandler.js";
import { BadRequestError } from "../../lib/errors.js";
import { groupsService } from "./groups.service.js";
import {
  groupCreateSchema,
  groupUpdateSchema,
  groupIdSchema,
} from "./groups.schema.js";

function parseId(value) {
  const result = groupIdSchema.safeParse(value);

  if (!result.success) {
    throw new BadRequestError("Некоректний id групи");
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

export const groupsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await groupsService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    res.json(await groupsService.getById(parseId(req.params.id)));
  }),

  create: asyncHandler(async (req, res) => {
    const input = validateBody(groupCreateSchema, req.body);

    res.status(201).json(await groupsService.create(input));
  }),

  update: asyncHandler(async (req, res) => {
    const input = validateBody(groupUpdateSchema, req.body);

    res.json(
      await groupsService.update(parseId(req.params.id), input),
    );
  }),

  delete: asyncHandler(async (req, res) => {
    res.json(await groupsService.delete(parseId(req.params.id)));
  }),
};
