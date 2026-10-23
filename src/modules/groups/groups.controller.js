import { asyncHandler } from "../../lib/asyncHandler.js";
import { groupsService } from "./groups.service.js";

export const groupsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await groupsService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await groupsService.getById(id));
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.validated.body;
    res.status(201).json(await groupsService.create(body));
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    res.json(await groupsService.update(id, body));
  }),

  delete: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await groupsService.delete(id));
  }),
};