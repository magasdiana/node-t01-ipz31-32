// Прибирає секрети з тексту перед виводом у лог. Prisma у повідомленнях про
// помилки друкує аргументи запиту, у тому числі passwordHash.
const BCRYPT_HASH = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g;
const SECRET_FIELD =
  /("?(?:passwordHash|password|token)"?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|`[^`]*`)/gi;

export function redactSecrets(text) {
  return String(text).replace(BCRYPT_HASH, "***").replace(SECRET_FIELD, '$1"***"');
}

// Рядок для console.error: стек (або повідомлення) помилки без секретів
export function safeErrorForLog(err) {
  if (err && typeof err === "object") {
    return redactSecrets(err.stack ?? err.message ?? String(err));
  }
  return redactSecrets(err);
}
