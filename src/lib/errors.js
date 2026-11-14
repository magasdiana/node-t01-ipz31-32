export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
    this.expose = true; // повідомлення можна показати клієнту
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Некоректні дані", details) {
    super(400, message, details);
  }
}

// 401: немає токена, він недійсний або прострочений
export class UnauthorizedError extends AppError {
  constructor(message = "Потрібна авторизація", details) {
    super(401, message, details);
  }
}

// 403: користувач відомий, але його роль не має права на дію
export class ForbiddenError extends AppError {
  constructor(message = "Недостатньо прав", details) {
    super(403, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Запис не знайдено", details) {
    super(404, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Конфлікт з існуючими даними", details) {
    super(409, message, details);
  }
}
