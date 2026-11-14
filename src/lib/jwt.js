import jwt from "jsonwebtoken";
import { getJwtSecret, getJwtExpiresIn } from "../config/auth.js";
import { isRole } from "../config/roles.js";

const ALGORITHM = "HS256";
const JWT_ERRORS = new Set([
  "JsonWebTokenError",
  "TokenExpiredError",
  "NotBeforeError",
]);

// У токен кладемо лише id (sub) і роль. Логін і хеш пароля не потрапляють.
export function signToken(user) {
  return jwt.sign({ role: user.role }, getJwtSecret(), {
    algorithm: ALGORITHM,
    subject: String(user.id),
    expiresIn: getJwtExpiresIn(),
  });
}

// Повертає { id, role } або кидає помилку jsonwebtoken (див. isJwtError).
// Помилка конфігурації (немає JWT_SECRET) НЕ вважається помилкою токена.
export function verifyToken(token) {
  const payload = jwt.verify(token, getJwtSecret(), {
    algorithms: [ALGORITHM],
  });
  const id = Number(payload.sub);

  if (!Number.isSafeInteger(id) || id < 1 || !isRole(payload.role)) {
    throw new jwt.JsonWebTokenError("Некоректний вміст токена");
  }

  return { id, role: payload.role };
}

export const isJwtError = (err) => JWT_ERRORS.has(err?.name);
export const isTokenExpired = (err) => err?.name === "TokenExpiredError";
