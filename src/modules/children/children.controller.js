// The "controller" layer of the children module.

import { asyncHandler } from "../../lib/asyncHandler.js";
import { BadRequestError } from "../../lib/errors.js";
import { childrenService } from "./children.service.js";
import {
  childCreateSchema,
  childUpdateSchema,
  childIdSchema,
} from "./children.schema.js";

function parseId(value) {
  const result = childIdSchema.safeParse(value);

  if (!result.success) {
    throw new BadRequestError("Некоректний id дитини");
  }

  return result.data;
}

function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestError(
      "Помилка валідації",
      result.error.issues,
    );
  }

  return result.data;
}

export const childrenController = {
  list: asyncHandler(async (req, res) => {
    res.json(await childrenService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    res.json(
      await childrenService.getById(parseId(req.params.id)),
    );
  }),

  create: asyncHandler(async (req, res) => {
    const input = validateBody(childCreateSchema, req.body);
    const child = await childrenService.create(input);

    res.status(201).json(child);
  }),

  update: asyncHandler(async (req, res) => {
    const input = validateBody(childUpdateSchema, req.body);
    const child = await childrenService.update(
      parseId(req.params.id),
      input,
    );

    res.json(child);
  }),

  delete: asyncHandler(async (req, res) => {
    const result = await childrenService.remove(
      parseId(req.params.id),
    );

    res.json(result);
  }),
};
