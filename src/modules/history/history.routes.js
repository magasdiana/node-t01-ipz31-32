import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  listHistorySchema,
  historyIdSchema,
  historyStateSchema,
  entityHistorySchema,
} from "./history.schema.js";
import { historyController } from "./history.controller.js";

export function createHistoryRouter(controller) {
  const router = Router();

  router.get("/", validate(listHistorySchema), controller.list);
  // /state ОБОВ'ЯЗКОВО перед /:id, інакше "state" піде в параметр id
  router.get("/state", validate(historyStateSchema), controller.getState);
  router.get("/:id", validate(historyIdSchema), controller.getById);

  return router;
}

// Для монтування під /children і /groups: GET /:id/history
export function createEntityHistoryRouter(controller, entityKey) {
  const router = Router();
  router.get(
    "/:id/history",
    validate(entityHistorySchema),
    controller.forEntity(entityKey),
  );
  return router;
}

export const childHistoryRoutes = createEntityHistoryRouter(
  historyController,
  "child",
);
export const groupHistoryRoutes = createEntityHistoryRouter(
  historyController,
  "group",
);

export default createHistoryRouter(historyController);
