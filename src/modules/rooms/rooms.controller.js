import { asyncHandler } from "../../lib/asyncHandler.js";
import { roomsService } from "./rooms.service.js";

export const roomsController = {
  list: asyncHandler(async (req, res) => {
    res.json(await roomsService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await roomsService.getById(id));
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.validated.body;
    res.status(201).json(await roomsService.create(body));
  }),

  update: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;
    res.json(await roomsService.update(id, body));
  }),

  delete: asyncHandler(async (req, res) => {
    const { id } = req.validated.params;
    res.json(await roomsService.delete(id));
  }),
};