import { asyncHandler } from "../../lib/asyncHandler.js";
import { staffService } from "./staff.service.js";

export const staffController = {
  getAll: asyncHandler(async (req, res) => {
    res.json(await staffService.getAll());
  }),

  getById: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await staffService.getById(id));
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.validated.body;
    res.status(201).json(await staffService.create(body));
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    res.json(await staffService.update(id, body));
  }),

  delete: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await staffService.delete(id));
  }),
};