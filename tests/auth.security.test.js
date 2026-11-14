import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { redactSecrets, safeErrorForLog } from "../src/lib/redact.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { maskSensitive } from "../src/lib/historySchema.js";
import { userDto } from "../src/lib/userDto.js";
import {
  BCRYPT_HASH_REGEX,
  hashPassword,
  isBcryptHash,
} from "../src/lib/password.js";
import { getJwtSecret, isAuthEnabled } from "../src/config/auth.js";

const HASH = "$2b$10$" + "a".repeat(53);

const ENV_KEYS = ["AUTH_ENABLED", "JWT_SECRET", "NODE_ENV", "BCRYPT_ROUNDS"];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.BCRYPT_ROUNDS = "4";
});

afterEach(() => {
  mock.restoreAll();
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// ---------- паролі ----------

test("hashPassword дає bcrypt-хеш, що відрізняється від пароля і від виклику до виклику", async () => {
  const a = await hashPassword("Secret#123");
  const b = await hashPassword("Secret#123");

  assert.ok(isBcryptHash(a));
  assert.notEqual(a, "Secret#123");
  assert.notEqual(a, b); // різна сіль
});

test("isBcryptHash відхиляє відкритий пароль та підроблені значення", () => {
  assert.equal(isBcryptHash("Secret#123"), false);
  assert.equal(isBcryptHash("$2b$10$short"), false);
  assert.equal(isBcryptHash(null), false);
  assert.ok(BCRYPT_HASH_REGEX.test(HASH));
});

// ---------- маскування в історії (на стороні застосунку) ----------

test("maskSensitive маскує passwordHash у знімку users як ***", () => {
  const snapshot = {
    id: 1,
    data: { login: "admin", passwordHash: HASH, role: "admin" },
  };
  const masked = maskSensitive(snapshot);

  assert.equal(masked.data.passwordHash, "***");
  assert.equal(masked.data.login, "admin");
  assert.ok(!JSON.stringify(masked).includes(HASH));
});

// ---------- відповіді API ----------

test("userDto віддає лише id, login, role", () => {
  const dto = userDto({
    id: 4,
    data: { login: "x", passwordHash: HASH, role: "teacher", extra: 1 },
  });

  assert.deepEqual(dto, { id: 4, login: "x", role: "teacher" });
  assert.equal(userDto(null), null);
});

// ---------- логи ----------

test("redactSecrets прибирає bcrypt-хеші та поля пароля", () => {
  assert.ok(!redactSecrets(`hash ${HASH} end`).includes(HASH));
  assert.equal(
    redactSecrets('{"password":"abc","login":"x"}'),
    '{"password":"***","login":"x"}',
  );
  assert.ok(!redactSecrets(`data: { passwordHash: "${HASH}" }`).includes(HASH));
  assert.equal(redactSecrets("звичайний текст"), "звичайний текст");
});

test("safeErrorForLog не лишає хеш у стеку помилки", () => {
  const err = new Error(`Invalid prisma.user.create() invocation: passwordHash: "${HASH}"`);
  assert.ok(!safeErrorForLog(err).includes(HASH));
});

test("errorHandler: 500 не пише passwordHash у console.error і не показує деталі клієнту", () => {
  const logged = [];
  mock.method(console, "error", (...args) => logged.push(args.join(" ")));

  let sent;
  const res = {
    headersSent: false,
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      sent = body;
    },
  };

  errorHandler(
    new Error(`boom: passwordHash: "${HASH}"`),
    { method: "POST", originalUrl: "/users" },
    res,
    () => {},
  );

  assert.equal(res.code, 500);
  assert.equal(sent.error.status, 500);
  assert.ok(!JSON.stringify(sent).includes(HASH));
  assert.equal(logged.length, 1);
  assert.ok(!logged[0].includes(HASH), "хеш потрапив у лог");
});

// ---------- конфігурація ----------

test("isAuthEnabled: за замовчуванням увімкнено, false вимикає лише поза production", () => {
  process.env.NODE_ENV = "test";
  delete process.env.AUTH_ENABLED;
  assert.equal(isAuthEnabled(), true);

  process.env.AUTH_ENABLED = "false";
  assert.equal(isAuthEnabled(), false);

  process.env.AUTH_ENABLED = "FALSE";
  assert.equal(isAuthEnabled(), false);

  process.env.AUTH_ENABLED = "0"; // лише явне false вимикає
  assert.equal(isAuthEnabled(), true);

  process.env.NODE_ENV = "production";
  process.env.AUTH_ENABLED = "false";
  assert.equal(isAuthEnabled(), true);
});

test("getJwtSecret: порожній, короткий та заглушка в production відхиляються", () => {
  process.env.NODE_ENV = "test";

  delete process.env.JWT_SECRET;
  assert.throws(() => getJwtSecret(), /JWT_SECRET/);

  process.env.JWT_SECRET = "short";
  assert.throws(() => getJwtSecret(), /JWT_SECRET/);

  process.env.JWT_SECRET = "change_me_to_a_long_random_string";
  assert.equal(getJwtSecret(), "change_me_to_a_long_random_string"); // поза production можна

  process.env.NODE_ENV = "production";
  assert.throws(() => getJwtSecret(), /заглушкою/);

  process.env.JWT_SECRET = "a-real-secret-a-real-secret-123";
  assert.equal(getJwtSecret(), "a-real-secret-a-real-secret-123");
});

// ---------- міграція (статична перевірка вмісту) ----------

test("міграція users: унікальний індекс логіна, CHECK на bcrypt і тригер історії", () => {
  const sql = readFileSync(
    new URL("../prisma/migrations/20261112090000_users_auth/migration.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /CREATE TABLE "users"\s*\(\s*"id" SERIAL NOT NULL,\s*"data" JSONB NOT NULL/);
  assert.match(sql, /CREATE UNIQUE INDEX "users_login_key" ON "users" \(\("data" ->> 'login'\)\)/);
  assert.match(sql, /\\\$2\[aby\]/); // перевірка формату bcrypt-хеша
  assert.match(sql, /ADD COLUMN "parent_id" INTEGER/);
  assert.match(sql, /ADD COLUMN "user_id" INTEGER/);
  assert.match(sql, /CREATE TRIGGER "history_audit_users"/);
});
