import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

const send = (res, status, message, details) =>
  res.status(status).json({
    error: { status, message, ...(details !== undefined && { details }) },
  });

// Невідомий маршрут: стоїть після всіх роутів
export function notFound(req, res) {
  send(res, 404, `Маршрут ${req.method} ${req.originalUrl} не знайдено`);
}

// Має бути останнім middleware, з чотирма аргументами
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Zod: некоректні дані запиту
  if (err instanceof ZodError) {
    return send(res, 400, "Помилка валідації", err.issues);
  }

  // Наші помилки (BadRequestError, NotFoundError, ConflictError)
  if (err instanceof AppError) {
    return send(res, err.status, err.message, err.details);
  }

  // Невалідний JSON у тілі запиту (body-parser)
  if (err instanceof SyntaxError && err.type === "entity.parse.failed") {
    return send(res, 400, "Невалідний JSON у тілі запиту");
  }

  // Prisma: запис не знайдено (наприклад, update/delete неіснуючого id)
  if (err.code === "P2025") {
    return send(res, 404, "Запис не знайдено");
  }

  // Prisma: порушено зовнішній ключ (посилання на неіснуючий запис)
  if (err.code === "P2003") {
    return send(
      res,
      409,
      "Пов'язаний запис не існує або не може бути видалений",
    );
  }

  // Помилки клієнта з відомим статусом (наприклад, 413 від express.json)
  if (
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 500 &&
    err.expose
  ) {
    return send(res, err.status, err.message);
  }

  // Усе інше: деталі лише в логах сервера, клієнту загальне повідомлення
  console.error(err);
  return send(res, 500, "Внутрішня помилка сервера");
}
