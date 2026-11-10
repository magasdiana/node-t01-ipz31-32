
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  listHistorySchema,
  historyIdSchema,
  historyStateSchema,
  entityHistorySchema,
} from "./history.schema.js";
import { historyController } from "./history.controller.js";

export function createHistoryRouter(customController) {
  const router = Router();

  const ctrl = customController || historyController;

  router.get("/", validate(listHistorySchema), ctrl.list);
  router.get("/state", validate(historyStateSchema), ctrl.getStateAt);
  router.get("/:id", validate(historyIdSchema), ctrl.getById);

  return router;
}

export function createEntityHistoryRouter(controller, entityKey) {
  const router = Router();
  const ctrl = controller || historyController;

  router.get(
    "/:id/history",
    validate(entityHistorySchema),
    ctrl.forEntity(entityKey),
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
