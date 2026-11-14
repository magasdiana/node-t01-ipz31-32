// Підключається в npm test через `node --import ./tests/setup.env.js --test`.
// Наявні тести ходять в API без токена, тому за замовчуванням вимикаємо
// авторизацію (лише поза production). Тести авторизації вмикають її самі,
// бо AUTH_ENABLED читається в момент запиту.
process.env.NODE_ENV ??= "test";
process.env.AUTH_ENABLED ??= "false";
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret";
process.env.BCRYPT_ROUNDS ??= "4"; // швидкий bcrypt у тестах
