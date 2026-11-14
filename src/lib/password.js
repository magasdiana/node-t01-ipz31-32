import bcrypt from "bcryptjs";

// Вартість bcrypt: 10 за замовчуванням; у тестах знижується через BCRYPT_ROUNDS.
function rounds() {
  const value = Number(process.env.BCRYPT_ROUNDS);
  if (!Number.isInteger(value)) return 10;
  return Math.min(Math.max(value, 4), 14);
}

// bcrypt-хеш: $2a$ / $2b$ / $2y$, вартість, 53 символи солі та хешу (разом 60)
export const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export const isBcryptHash = (value) =>
  typeof value === "string" && BCRYPT_HASH_REGEX.test(value);

export const hashPassword = (plain) => bcrypt.hash(plain, rounds());

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Якщо логіна не існує, все одно витрачаємо час на порівняння з фіктивним
// хешем, щоб за часом відповіді не можна було вгадати, які логіни є в системі.
let dummyHash;
export async function burnPasswordCheck(plain) {
  dummyHash ??= await hashPassword("timing-equalizer-password");
  await bcrypt.compare(plain, dummyHash);
}

// bcrypt ігнорує все після 72-го байта, тому довші паролі не приймаємо
export const MAX_PASSWORD_BYTES = 72;
export const fitsBcrypt = (plain) =>
  Buffer.byteLength(plain, "utf8") <= MAX_PASSWORD_BYTES;
