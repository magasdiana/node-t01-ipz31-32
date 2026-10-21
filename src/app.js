import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { openapiSpec } from "./docs/openapi.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

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

const app = express();

app.use(cors());
app.use(express.json());

// Перевірка стану сервера
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// OpenAPI та Swagger-документація
app.get("/openapi.json", (req, res) => {
  res.json(openapiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Модулі API. Авторизації поки немає.
app.use("/children", childrenRoutes);
app.use("/groups", groupsRoutes);
app.use("/rooms", roomsRoutes);
app.use("/staff", staffRoutes);
app.use("/subjects", subjectsRoutes);
app.use("/schedules", schedulesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/reports", reportsRoutes);

// Lessons містять маршрути для різних ресурсів,
// тому монтуємо їх із кореня.
app.use("/", lessonsRoutes);
app.use("/", pricingRoutes); // Модуль pricing: /settings/prices та /children/:id/invoice

// Обробка неіснуючих маршрутів та помилок
app.use(notFound);
app.use(errorHandler);

export default app;