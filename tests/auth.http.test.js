import { test, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { requestContextMiddleware } from "../src/lib/requestContext.js";
import { notFound, errorHandler } from "../src/middleware/errorHandler.js";
import { authenticate } from "../src/middleware/auth.js";
import { createAuthRouter } from "../src/modules/auth/auth.routes.js";
import { createAuthController } from "../src/modules/auth/auth.controller.js";
import { createAuthService } from "../src/modules/auth/auth.service.js";
import { createUsersRouter } from "../src/modules/users/users.routes.js";
import { createUsersController } from "../src/modules/users/users.controller.js";
import { createUsersService } from "../src/modules/users/users.service.js";
import { hashPassword, verifyPassword, burnPasswordCheck } from "../src/lib/password.js";
import { signToken } from "../src/lib/jwt.js";

const ENV_KEYS = ["AUTH_ENABLED", "JWT_SECRET", "NODE_ENV", "BCRYPT_ROUNDS"];
let saved;
let server;
let baseUrl;
let adminHash;
let rows;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.AUTH_ENABLED = "true";
  process.env.JWT_SECRET = "http-test-secret-http-test-secret";
  process.env.NODE_ENV = "test";
  process.env.BCRYPT_ROUNDS = "4";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// Репозиторій у пам'яті: тест перевіряє HTTP-шар без бази
function createRepo() {
  return {
    async list() {
      return rows;
    },
    async getById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findByLogin(login) {
      return rows.find((r) => r.data.login === login) ?? null;
    },
    async create({ data }) {
      const row = { id: rows.length + 1, data };
      rows.push(row);
      return row;
    },
  };
}

before(async () => {
  process.env.BCRYPT_ROUNDS = "4";
  adminHash = await hashPassword("Admin#2026");
  rows = [{ id: 1, data: { login: "admin", passwordHash: adminHash, role: "admin" } }];

  const repo = createRepo();
  const authService = createAuthService({
    usersRepository: repo,
    verifyPassword,
    burnPasswordCheck,
    signToken,
  });
  const usersService = createUsersService({ usersRepository: repo, hashPassword });

  const app = express();
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use("/auth", createAuthRouter(createAuthController(authService)));
  app.use(authenticate);
  app.use("/users", createUsersRouter(createUsersController(usersService)));
  app.use(notFound);
  app.use(errorHandler);

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const call = (path, { token, body, method } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: method ?? (body !== undefined ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

async function adminToken() {
  const res = await call("/auth/login", {
    body: { login: "admin", password: "Admin#2026" },
  });
  return (await res.json()).token;
}

test("POST /auth/login: 200, token і user без passwordHash", async () => {
  const res = await call("/auth/login", {
    body: { login: "ADMIN", password: "Admin#2026" },
  });
  const text = await res.text();

  assert.equal(res.status, 200);
  const body = JSON.parse(text);
  assert.equal(typeof body.token, "string");
  assert.deepEqual(body.user, { id: 1, login: "admin", role: "admin" });
  assert.ok(!text.includes("passwordHash"));
  assert.ok(!text.includes(adminHash));
});

test("POST /auth/login: хибний пароль і неіснуючий логін дають однакову 401", async () => {
  const wrong = await call("/auth/login", { body: { login: "admin", password: "nope" } });
  const ghost = await call("/auth/login", { body: { login: "ghost", password: "nope" } });

  assert.equal(wrong.status, 401);
  assert.equal(ghost.status, 401);
  assert.deepEqual(await wrong.json(), await ghost.json());
});

test("POST /auth/login: порожнє тіло → 400 у форматі { error: { status, message, details } }", async () => {
  const res = await call("/auth/login", { body: {} });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error.status, 400);
  assert.equal(typeof body.error.message, "string");
  assert.ok(Array.isArray(body.error.details));
});

test("захищений маршрут без токена → 401 у єдиному форматі", async () => {
  const res = await call("/users");
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.error.status, 401);
  assert.equal(typeof body.error.message, "string");
});

test("недійсний токен → 401", async () => {
  const res = await call("/users", { token: "garbage" });
  assert.equal(res.status, 401);
});

test("роль parent на маршруті Admin → 403 у єдиному форматі", async () => {
  const token = signToken({ id: 50, role: "parent" });
  const res = await call("/users", { token });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error.status, 403);
  assert.deepEqual(body.error.details, { requiredRoles: ["admin"] });
});

test("GET /users для Admin: список без passwordHash", async () => {
  const res = await call("/users", { token: await adminToken() });
  const text = await res.text();

  assert.equal(res.status, 200);
  assert.ok(!text.includes("passwordHash"));
  assert.ok(!text.includes(adminHash));
});

test("POST /users: створює користувача, дублікат логіна (будь-який регістр) → 409", async () => {
  const token = await adminToken();

  const created = await call("/users", {
    token,
    body: { login: "Olena", password: "Str0ng#Pass", role: "parent" },
  });
  assert.equal(created.status, 201);
  const user = await created.json();
  assert.equal(user.login, "olena");
  assert.equal(user.role, "parent");
  assert.ok(!("passwordHash" in user));

  const duplicate = await call("/users", {
    token,
    body: { login: "OLENA", password: "Another#Pass1", role: "teacher" },
  });
  assert.equal(duplicate.status, 409);

  // нова людина може увійти зі своїм паролем
  const login = await call("/auth/login", {
    body: { login: "olena", password: "Str0ng#Pass" },
  });
  assert.equal(login.status, 200);
});

test("POST /users: слабкий пароль і невідома роль → 400", async () => {
  const token = await adminToken();

  const weak = await call("/users", {
    token,
    body: { login: "newuser", password: "123", role: "parent" },
  });
  const role = await call("/users", {
    token,
    body: { login: "newuser", password: "Str0ng#Pass", role: "root" },
  });

  assert.equal(weak.status, 400);
  assert.equal(role.status, 400);
});

test("AUTH_ENABLED=false (не production): захищений маршрут відкритий", async () => {
  process.env.AUTH_ENABLED = "false";
  const res = await call("/users");
  assert.equal(res.status, 200);
});

test("production: AUTH_ENABLED=false не вимикає авторизацію", async () => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_ENABLED = "false";

  const res = await call("/users");
  assert.equal(res.status, 401);
});
