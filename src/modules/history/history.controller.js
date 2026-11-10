
import { asyncHandler } from "../../lib/asyncHandler.js";
import { historyService } from "./history.service.js";

export function createHistoryController(service) {
  return {
    list: asyncHandler(async (req, res) => {
      res.json(await service.list(req.validated.query));
    }),

    getStateAt: asyncHandler(async (req, res) => {
      const { entity, entityId, at } = req.validated.query;
      const state = await service.getStateAt(entity, entityId, at);
      res.json({ state });
    }),

    getById: asyncHandler(async (req, res) => {
      res.json(await service.getById(req.validated.params.id));
    }),

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

const defaultHistoryController = createHistoryController(historyService);

export const getStateAt = defaultHistoryController.getStateAt;
export const list = defaultHistoryController.list;
export const getById = defaultHistoryController.getById;
export const forEntity = defaultHistoryController.forEntity;

export const historyController = defaultHistoryController;

export default historyController;
