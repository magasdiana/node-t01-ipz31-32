import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  listHistorySchema,
  historyIdSchema,
  historyStateSchema,
  entityHistorySchema,
} from "./history.schema.js";
import { historyController, getStateAt } from "./history.controller.js";

export function createHistoryRouter(customController) {
  const router = Router();

  // Використовуємо переданий контролер або дефолтний, а для stateAt гарантовано беремо функцію
  const ctrl = customController || historyController;
  const stateHandler = ctrl.getStateAt || getStateAt;

  router.get("/", validate(listHistorySchema), ctrl.list);
  // /state ОБОВ'ЯЗКОВО перед /:id, інакше "state" піде в параметр id
  router.get("/state", validate(historyStateSchema), stateHandler);
  router.get("/:id", validate(historyIdSchema), ctrl.getById);

  return router;
}

// Для монтування під /children і /groups: GET /:id/history
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