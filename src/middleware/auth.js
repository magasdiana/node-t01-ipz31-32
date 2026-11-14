import { isAuthEnabled } from "../config/auth.js";
import { ROLE_VALUES } from "../config/roles.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { isJwtError, isTokenExpired, verifyToken } from "../lib/jwt.js";
import { setActor } from "../lib/requestContext.js";

const BEARER = /^Bearer\s+(\S+)$/i;

function extractToken(req) {
  const header = req.headers?.authorization;
  if (typeof header !== "string") return null;
  return BEARER.exec(header.trim())?.[1] ?? null;
}

// Кладе користувача в req.user і в контекст запиту: звідти actor потрапляє
// в app.actor транзакції PostgreSQL, а тригер пише його в історію.
function bindUser(req, user) {
  req.user = user;

  try {
    setActor(user);
  } catch (err) {
    // Поза контекстом запиту (прямий виклик у юніт-тесті) actor не потрібен
    if (!/outside an active request context/.test(err.message)) throw err;
  }
}

// 401, якщо токена немає, він недійсний або прострочений.
// Успіх: req.user = { id, role }.
export function authenticate(req, _res, next) {
  const token = extractToken(req);

  // AUTH_ENABLED=false (лише поза production): токен не вимагаємо, але якщо
  // валідний токен усе ж прийшов, користувача підхоплюємо.
  if (!isAuthEnabled()) {
    if (token) {
      try {
        bindUser(req, verifyToken(token));
      } catch (err) {
        if (!isJwtError(err)) return next(err);
      }
    }
    return next();
  }

  if (!token) {
    return next(
      new UnauthorizedError(
        "Потрібна авторизація: передайте заголовок Authorization: Bearer <token>",
      ),
    );
  }

  let user;
  try {
    user = verifyToken(token);
  } catch (err) {
    if (isJwtError(err)) {
      return next(
        new UnauthorizedError(
          isTokenExpired(err) ? "Термін дії токена минув" : "Недійсний токен",
        ),
      );
    }
    return next(err); // наприклад, не налаштовано JWT_SECRET: це 500, а не 401
  }

  bindUser(req, user);
  next();
}

// 403, якщо роль користувача не входить у список. Ставити після authenticate.
// authorize(ROLES.ADMIN, ROLES.MANAGER)
export function authorize(...roles) {
  const allowed = roles.flat();

  if (allowed.length === 0) {
    throw new Error("authorize() потребує хоча б одну роль");
  }
  const unknown = allowed.filter((role) => !ROLE_VALUES.includes(role));
  if (unknown.length > 0) {
    throw new Error(`authorize(): невідомі ролі: ${unknown.join(", ")}`);
  }

  return (req, _res, next) => {
    if (!isAuthEnabled()) return next();
    if (!req.user) return next(new UnauthorizedError());

    if (!allowed.includes(req.user.role)) {
      return next(
        new ForbiddenError("Недостатньо прав для цієї дії", {
          requiredRoles: allowed,
        }),
      );
    }
    next();
  };
}
