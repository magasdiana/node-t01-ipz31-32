import { asyncHandler } from "../../lib/asyncHandler.js";
import { subjectsService } from "./subjects.service.js";

export const subjectsController = {
  getAll: asyncHandler(async (req, res) => {
    res.json(await subjectsService.getAll());
  }),

  getById: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await subjectsService.getById(id));
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.validated.body;
    res.status(201).json(await subjectsService.create(body));
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    res.json(await subjectsService.update(id, body));
  }),

  delete: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await subjectsService.delete(id));
  }),
};