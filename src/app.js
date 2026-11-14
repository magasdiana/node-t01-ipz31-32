import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { openapiSpec } from "./docs/openapi.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/auth.js"; // [auth] нове

import childrenRoutes from "./modules/children/children.routes.js";
import groupsRoutes from "./modules/groups/groups.routes.js";
import roomsRoutes from "./modules/rooms/rooms.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import subjectsRoutes from "./modules/subjects/subjects.routes.js";
import lessonsRoutes from "./modules/lessons/lessons.routes.js";
import schedulesRoutes from "./modules/schedules/schedules.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import pricingRoutes from "./modules/pricing/pricing.routes.js";
import authRoutes from "./modules/auth/auth.routes.js"; // [auth] нове
import usersRoutes from "./modules/users/users.routes.js"; // [auth] нове
import { requestContextMiddleware } from "./lib/requestContext.js";
import historyRoutes, {
  childHistoryRoutes,
  groupHistoryRoutes,
} from "./modules/history/history.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestContextMiddleware);

// ---------- Публічні маршрути (без токена) ----------

// Перевірка стану сервера
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// OpenAPI та Swagger-документація
app.get("/openapi.json", (req, res) => {
  res.json(openapiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Вхід [auth]
app.use("/auth", authRoutes);

// ---------- Усе, що нижче, вимагає токена ----------
// authenticate перевіряє JWT, кладе req.user = { id, role } і передає actor
// в контекст запиту (історія змін). Ролі на маршрутах (authorize) додає Богдан.
app.use(authenticate); // [auth] нове

// Модулі API
app.use("/children", childHistoryRoutes);
app.use("/children", childrenRoutes);
app.use("/groups", groupHistoryRoutes);
app.use("/groups", groupsRoutes);
app.use("/rooms", roomsRoutes);
app.use("/staff", staffRoutes);
app.use("/subjects", subjectsRoutes);
app.use("/schedules", schedulesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/history", historyRoutes);
app.use("/users", usersRoutes); // [auth] нове: лише Admin

// Lessons містять маршрути для різних ресурсів,
// тому монтуємо їх із кореня.
app.use("/", lessonsRoutes);
app.use("/", pricingRoutes); // Модуль pricing: /settings/prices та /children/:id/invoice

// Обробка неіснуючих маршрутів та помилок
app.use(notFound);
app.use(errorHandler);

export default app;
