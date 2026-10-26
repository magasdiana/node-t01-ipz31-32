import { asyncHandler } from "../../lib/asyncHandler.js";
import { lessonsService } from "./lessons.service.js";

// Дані вже перевірені validate() і лежать у req.validated: { body, params, query }
export const lessonsController = {
  listByGroup: asyncHandler(async (req, res) => {
    const { params } = req.validated;
    res.json(await lessonsService.listByGroup(params.id));
  }),

  update: asyncHandler(async (req, res) => {
    const { params, body } = req.validated;
    res.json(await lessonsService.update(params.id, body));
  }),
};
