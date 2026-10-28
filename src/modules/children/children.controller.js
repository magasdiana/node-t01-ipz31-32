// The "controller" layer of the children module.

import { asyncHandler } from "../../lib/asyncHandler.js";
import { childrenService } from "./children.service.js";

export const childrenController = {
  list: asyncHandler(async (req, res) => {
    res.json(await childrenService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    res.json(await childrenService.getById(id));
  }),

  create: asyncHandler(async (req, res) => {
    const input = req.validated.body;
    const child = await childrenService.create(input);

    res.status(201).json(child);
  }),

  update: asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    const input = req.validated.body;
    const child = await childrenService.update(id, input);

    res.json(child);
  }),

  delete: asyncHandler(async (req, res) => {
    const id = req.validated.params.id;
    const result = await childrenService.remove(id);

    res.json(result);
  }),
};