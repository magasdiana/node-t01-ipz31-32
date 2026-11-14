import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { authenticate, authorize } from "../src/middleware/auth.js";
import { signToken } from "../src/lib/jwt.js";
import {
  getContext,
  requestContextMiddleware,
} from "../src/lib/requestContext.js";
import { ForbiddenError, UnauthorizedError } from "../src/lib/errors.js";
import { ROLES } from "../src/config/roles.js";

const SECRET = "unit-test-secret-unit-test-secret";
const ENV_KEYS = ["AUTH_ENABLED", "JWT_SECRET", "NODE_ENV", "JWT_EXPIRES_IN"];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.AUTH_ENABLED = "true";
  process.env.JWT_SECRET = SECRET;
  process.env.NODE_ENV = "test";
  delete process.env.JWT_EXPIRES_IN;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// Викликає middleware й повертає те, з чим викликано next()
function run(middleware, req) {
  return new Promise((resolve) => middleware(req, {}, (err) => resolve(err)));
}

const bearer = (token) => ({ headers: { authorization: `Bearer ${token}` } });
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

test("authenticate: без заголовка Authorization → 401", async () => {
  const err = await run(authenticate, { headers: {} });
  assert.ok(err instanceof UnauthorizedError);
  assert.equal(err.status, 401);
});

test("authenticate: схема не Bearer → 401", async () => {
  const err = await run(authenticate, {
    headers: { authorization: "Basic YWRtaW46YWRtaW4=" },
  });
  assert.equal(err?.status, 401);
});

test("authenticate: сміття замість токена → 401 «Недійсний токен»", async () => {
  const err = await run(authenticate, bearer("not-a-jwt"));
  assert.equal(err?.status, 401);
  assert.equal(err.message, "Недійсний токен");
});

test("authenticate: токен, підписаний чужим секретом → 401", async () => {
  const forged = jwt.sign({ role: "admin" }, "another-secret-another-secret", {
    subject: "1",
  });
  const err = await run(authenticate, bearer(forged));
  assert.equal(err?.status, 401);
});

test("authenticate: прострочений токен → 401 з окремим повідомленням", async () => {
  const expired = jwt.sign({ role: "admin" }, SECRET, {
    subject: "1",
    expiresIn: -10,
  });
  const err = await run(authenticate, bearer(expired));
  assert.equal(err?.status, 401);
  assert.equal(err.message, "Термін дії токена минув");
});

test("authenticate: токен без підпису (alg none) відхиляється", async () => {
  const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "1", role: "admin" })}.`;
  const err = await run(authenticate, bearer(none));
  assert.equal(err?.status, 401);
});

test("authenticate: невідома роль у токені → 401", async () => {
  const token = jwt.sign({ role: "superuser" }, SECRET, { subject: "1" });
  const err = await run(authenticate, bearer(token));
  assert.equal(err?.status, 401);
});

test("authenticate: валідний токен кладе req.user = { id, role }", async () => {
  const token = signToken({ id: 7, role: ROLES.PARENT });
  const req = bearer(token);
  const err = await run(authenticate, req);

  assert.equal(err, undefined);
  assert.deepEqual(req.user, { id: 7, role: "parent" });
});

test("токен містить лише sub, role та службові поля (без логіна й хеша)", () => {
  const token = signToken({
    id: 3,
    role: ROLES.ADMIN,
    login: "admin",
    passwordHash: "x",
  });
  const payload = jwt.decode(token);

  assert.deepEqual(Object.keys(payload).sort(), ["exp", "iat", "role", "sub"]);
  assert.equal(payload.sub, "3");
});

test("authenticate передає actor у контекст запиту (для історії)", async () => {
  const token = signToken({ id: 5, role: ROLES.MANAGER });

  const actor = await new Promise((resolve) => {
    requestContextMiddleware({}, { setHeader() {} }, () => {
      authenticate(bearer(token), {}, () => resolve(getContext().actor));
    });
  });

  assert.deepEqual(actor, { id: 5, role: "manager" });
});

test("AUTH_ENABLED=false: запит без токена проходить", async () => {
  process.env.AUTH_ENABLED = "false";
  const req = { headers: {} };

  assert.equal(await run(authenticate, req), undefined);
  assert.equal(req.user, undefined);
});

test("AUTH_ENABLED=false: валідний токен усе одно підхоплюється", async () => {
  process.env.AUTH_ENABLED = "false";
  const req = bearer(signToken({ id: 2, role: ROLES.TEACHER }));

  assert.equal(await run(authenticate, req), undefined);
  assert.deepEqual(req.user, { id: 2, role: "teacher" });
});

test("production: AUTH_ENABLED=false ігнорується, без токена 401", async () => {
  process.env.NODE_ENV = "production";
  process.env.AUTH_ENABLED = "false";

  const err = await run(authenticate, { headers: {} });
  assert.equal(err?.status, 401);
});

test("не налаштований JWT_SECRET — це помилка сервера, а не 401", async () => {
  const token = signToken({ id: 1, role: ROLES.ADMIN });
  delete process.env.JWT_SECRET;

  const err = await run(authenticate, bearer(token));
  assert.ok(err instanceof Error);
  assert.ok(!(err instanceof UnauthorizedError));
  assert.match(err.message, /JWT_SECRET/);
});

test("authorize: дозволена роль проходить", async () => {
  const mw = authorize(ROLES.ADMIN, ROLES.MANAGER);
  const req = { user: { id: 1, role: "manager" } };
  assert.equal(await run(mw, req), undefined);
});

test("authorize: чужа роль → 403 зі списком потрібних ролей", async () => {
  const mw = authorize(ROLES.ADMIN);
  const err = await run(mw, { user: { id: 1, role: "parent" } });

  assert.ok(err instanceof ForbiddenError);
  assert.equal(err.status, 403);
  assert.deepEqual(err.details, { requiredRoles: ["admin"] });
});

test("authorize: без req.user → 401", async () => {
  const err = await run(authorize(ROLES.ADMIN), {});
  assert.equal(err?.status, 401);
});

test("authorize: AUTH_ENABLED=false пропускає всіх", async () => {
  process.env.AUTH_ENABLED = "false";
  assert.equal(await run(authorize(ROLES.ADMIN), {}), undefined);
});

test("authorize: помилки конфігурації ловляться при створенні", () => {
  assert.throws(() => authorize(), /хоча б одну роль/);
  assert.throws(() => authorize("admn"), /невідомі ролі: admn/);
});
