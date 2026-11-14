// Налаштування авторизації. Усе читається зі змінних оточення в момент виклику
// (а не при імпорті), тому тести можуть змінювати їх на льоту.

const DEFAULT_EXPIRES_IN = "8h";
const MIN_SECRET_LENGTH = 16;
const PLACEHOLDER_SECRET = /^change[_-]?me/i;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

// У production авторизація завжди увімкнена, AUTH_ENABLED тут ігнорується.
// Поза production вимкнути її можна лише явним AUTH_ENABLED=false
// (так працюють наявні тести, що ходять без токена).
export function isAuthEnabled() {
  if (isProduction()) return true;
  return (
    String(process.env.AUTH_ENABLED ?? "true")
      .trim()
      .toLowerCase() !== "false"
  );
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET не задано або він коротший за ${MIN_SECRET_LENGTH} символів (див. .env.example)`,
    );
  }

  if (isProduction() && PLACEHOLDER_SECRET.test(secret)) {
    throw new Error("JWT_SECRET у production не може бути заглушкою");
  }

  return secret;
}

export function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

// Викликається під час старту сервера: падаємо одразу, а не на першому логіні.
export function assertAuthConfig() {
  getJwtSecret();

  if (isProduction() && process.env.AUTH_ENABLED === "false") {
    console.warn(
      "AUTH_ENABLED=false проігноровано: у production авторизація завжди ввімкнена",
    );
  }
}
