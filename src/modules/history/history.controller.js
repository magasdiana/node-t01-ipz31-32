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

export async function getStateAt(req, res, next) {
  try {
    const { entity, entityId, at } = req.query;

    if (!entity || !entityId || !at) {
      return res.status(400).json({ error: 'Missing required query parameters: entity, entityId, at' });
    }

    const state = await historyService.getStateAt(entity, Number(entityId), at);

    if (!state) {
      return res.status(404).json({ error: 'Entity state not found for the specified time' });
    }

    return res.json({ state });
  } catch (error) {
    next(error);
  }
}

export const historyController = createHistoryController(historyService);
