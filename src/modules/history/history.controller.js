import { asyncHandler } from "../../lib/asyncHandler.js";
import { historyService } from "./history.service.js";

export function createHistoryController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      res.json(await service.list(req.validated.query));
    }),

    getState: asyncHandler(async (req, res) => {
      res.json(await service.getState());
    }),

    getById: asyncHandler(async (req, res) => {
      res.json(await service.getById(req.validated.params.id));
    }),

    // Обробник для /children/:id/history, /groups/:id/history
    forEntity: (entityKey) =>
      asyncHandler(async (req, res) => {
        res.json(
          await service.listForEntity(
            entityKey,
            req.validated.params.id,
            req.validated.query,
          ),
        );
      }),
  };
}

export const historyController = createHistoryController(historyService);
