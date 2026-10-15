import { ZodError } from "zod";

export function notFound(req, res) {
  res.status(404).json({
    error: "NotFound",
    message: `Маршрут ${req.method} ${req.originalUrl} не знайдено`,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res
      .status(400)
      .json({ error: "ValidationError", details: err.issues });
  }
  // Коди помилок Prisma
  if (err.code === "P2025") {
    return res
      .status(404)
      .json({ error: "NotFound", message: "Запис не знайдено" });
  }
  if (err.code === "P2002") {
    return res
      .status(409)
      .json({ error: "Conflict", message: "Такий запис уже існує" });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    error: status >= 500 ? "InternalServerError" : err.name,
    message: status >= 500 ? "Внутрішня помилка сервера" : err.message,
  });
}
