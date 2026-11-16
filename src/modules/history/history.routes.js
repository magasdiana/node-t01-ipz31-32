
import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authorize } from "../../middleware/auth.js";
import { ACCESS } from "../../config/access.js";
import {
  listHistorySchema,
  historyIdSchema,
  historyStateSchema,
  entityHistorySchema,
} from "./history.schema.js";
import { historyController } from "./history.controller.js";

// authorize стоїть на кожному маршруті, а не через router.use: роутери
// /children/:id/history і /groups/:id/history змонтовані на тих самих префіксах,
// що й children і groups, і router.use закрив би для Admin-only й їхні маршрути.
export function createHistoryRouter(customController) {
  const router = Router();

  const ctrl = customController || historyController;

  router.get("/", authorize(ACCESS.HISTORY), validate(listHistorySchema), ctrl.list);
  router.get("/state", authorize(ACCESS.HISTORY), validate(historyStateSchema), ctrl.getStateAt);
  router.get("/:id", authorize(ACCESS.HISTORY), validate(historyIdSchema), ctrl.getById);

  return router;
}

export function createEntityHistoryRouter(controller, entityKey) {
  const router = Router();
  const ctrl = controller || historyController;

  router.get(
    "/:id/history",
    authorize(ACCESS.HISTORY),
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
