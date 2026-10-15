import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { openapiSpec } from "./docs/openapi.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import childrenRoutes from "./modules/children/children.routes.js";
import groupsRoutes from "./modules/groups/groups.routes.js";
import staffRoutes from "./modules/staff/staff.routes.js";
import subjectsRoutes from "./modules/subjects/subjects.routes.js";
import lessonsRoutes from "./modules/lessons/lessons.routes.js";
import schedulesRoutes from "./modules/schedules/schedules.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Документація
app.get("/openapi.json", (req, res) => res.json(openapiSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Модулі. Жодного auth-middleware: авторизації поки немає.
app.use("/children", childrenRoutes);
app.use("/groups", groupsRoutes);
app.use("/staff", staffRoutes);
app.use("/subjects", subjectsRoutes);
app.use("/schedules", schedulesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/reports", reportsRoutes);
// Lessons мають шляхи з різних ресурсів (/lessons/:id, /groups/:id/lessons),
// тому їх монтуємо з кореня, а повні шляхи задаємо в lessons.routes.js
app.use("/", lessonsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
