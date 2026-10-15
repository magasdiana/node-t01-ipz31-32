import express from "express";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Модульні роути підключимо, коли вони з'являться:
// app.use('/children', childrenRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
