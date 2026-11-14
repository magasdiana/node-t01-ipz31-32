import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import { createAuthService, INVALID_CREDENTIALS } from "../src/modules/auth/auth.service.js";
import { createUsersService, isUniqueViolation } from "../src/modules/users/users.service.js";
import { loginSchema } from "../src/modules/auth/auth.schema.js";
import { createUserSchema } from "../src/modules/users/users.schema.js";
import { hashPassword, verifyPassword, isBcryptHash } from "../src/lib/password.js";
import { signToken, verifyToken } from "../src/lib/jwt.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../src/lib/errors.js";

const ENV_KEYS = ["JWT_SECRET", "BCRYPT_ROUNDS", "AUTH_ENABLED", "NODE_ENV"];
let saved;

before(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.JWT_SECRET = "unit-test-secret-unit-test-secret";
  process.env.BCRYPT_ROUNDS = "4";
  process.env.NODE_ENV = "test";
});

after(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// Репозиторій у пам'яті (поведінка як у справжнього, включно з унікальністю)
function memoryRepo(initial = []) {
  const rows = [...initial];
  let seq = rows.length;

  return {
    rows,
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
      if (rows.some((r) => r.data.login === data.login)) {
        const err = new Error("Unique constraint failed");
        err.code = "P2002";
        throw err;
      }
      const row = { id: ++seq, data };
      rows.push(row);
      return row;
    },
  };
}

async function authFixture() {
  const passwordHash = await hashPassword("Secret#123");
  const repo = memoryRepo([
    { id: 1, data: { login: "admin", passwordHash, role: "admin" } },
  ]);
  const calls = { burn: 0 };
  const service = createAuthService({
    usersRepository: repo,
    verifyPassword,
    burnPasswordCheck: async () => {
      calls.burn += 1;
    },
    signToken,
  });
  return { repo, service, calls, passwordHash };
}

// ---------- login ----------

test("login: успіх повертає { token, user: { id, login, role } } без passwordHash", async () => {
  const { service, passwordHash } = await authFixture();
  const result = await service.login({ login: "admin", password: "Secret#123" });

  assert.deepEqual(Object.keys(result).sort(), ["token", "user"]);
  assert.deepEqual(result.user, { id: 1, login: "admin", role: "admin" });

  const json = JSON.stringify(result);
  assert.ok(!json.includes("passwordHash"));
  assert.ok(!json.includes(passwordHash));

  assert.deepEqual(verifyToken(result.token), { id: 1, role: "admin" });
});

test("login: хибний пароль → 401", async () => {
  const { service } = await authFixture();

  await assert.rejects(
    () => service.login({ login: "admin", password: "wrong" }),
    (err) => err instanceof UnauthorizedError && err.message === INVALID_CREDENTIALS,
  );
});

test("login: неіснуючий логін → те саме 401 і фіктивна перевірка пароля", async () => {
  const { service, calls } = await authFixture();

  await assert.rejects(
    () => service.login({ login: "ghost", password: "whatever" }),
    (err) => err instanceof UnauthorizedError && err.message === INVALID_CREDENTIALS,
  );
  assert.equal(calls.burn, 1);
});

test("login: запис без passwordHash не дає увійти", async () => {
  const repo = memoryRepo([{ id: 9, data: { login: "broken", role: "admin" } }]);
  const service = createAuthService({
    usersRepository: repo,
    verifyPassword,
    burnPasswordCheck: async () => {},
    signToken,
  });

  await assert.rejects(
    () => service.login({ login: "broken", password: "x" }),
    UnauthorizedError,
  );
});

// ---------- створення користувача ----------

function usersFixture(initial) {
  const repo = memoryRepo(initial);
  return { repo, service: createUsersService({ usersRepository: repo, hashPassword }) };
}

test("users.create: у БД лише bcrypt-хеш, відкритого пароля немає", async () => {
  const { service, repo } = usersFixture();
  const dto = await service.create({
    login: "olena",
    password: "Str0ng#Pass",
    role: "parent",
  });

  assert.deepEqual(dto, { id: 1, login: "olena", role: "parent" });

  const stored = repo.rows[0].data;
  assert.ok(isBcryptHash(stored.passwordHash));
  assert.ok(!JSON.stringify(stored).includes("Str0ng#Pass"));
  assert.ok(await verifyPassword("Str0ng#Pass", stored.passwordHash));
});

test("users.create: зайнятий логін → 409", async () => {
  const { service } = usersFixture([
    { id: 1, data: { login: "olena", passwordHash: "x", role: "parent" } },
  ]);

  await assert.rejects(
    () => service.create({ login: "olena", password: "Str0ng#Pass", role: "parent" }),
    ConflictError,
  );
});

test("users.create: гонка (перевірка пройшла, а БД відхилила) → 409, а не 500", async () => {
  const repo = memoryRepo();
  repo.findByLogin = async () => null; // перевірка не бачить дубліката
  repo.rows.push({ id: 1, data: { login: "olena", passwordHash: "x", role: "parent" } });
  const service = createUsersService({ usersRepository: repo, hashPassword });

  await assert.rejects(
    () => service.create({ login: "olena", password: "Str0ng#Pass", role: "parent" }),
    ConflictError,
  );
});

test("users.create: інші помилки БД не маскуються під 409", async () => {
  const boom = new Error("connection lost");
  const repo = memoryRepo();
  repo.create = async () => {
    throw boom;
  };
  const service = createUsersService({ usersRepository: repo, hashPassword });

  await assert.rejects(
    () => service.create({ login: "olena", password: "Str0ng#Pass", role: "parent" }),
    (err) => err === boom,
  );
});

test("isUniqueViolation розпізнає P2002, 23505 і назву індексу", () => {
  assert.ok(isUniqueViolation({ code: "P2002" }));
  assert.ok(isUniqueViolation({ code: "23505" }));
  assert.ok(isUniqueViolation(new Error('duplicate key value violates "users_login_key"')));
  assert.ok(!isUniqueViolation(new Error("timeout")));
  assert.ok(!isUniqueViolation(null));
});

test("users.list / getById не віддають passwordHash", async () => {
  const { service } = usersFixture([
    { id: 1, data: { login: "a", passwordHash: "secret-hash", role: "admin" } },
  ]);

  assert.deepEqual(await service.list(), [{ id: 1, login: "a", role: "admin" }]);
  assert.ok(!JSON.stringify(await service.getById(1)).includes("secret-hash"));
  await assert.rejects(() => service.getById(99), NotFoundError);
});

// ---------- Zod-схеми ----------

test("loginSchema: логін обрізається і приводиться до нижнього регістру", () => {
  const parsed = loginSchema.parse({ login: "  ADMIN ", password: "x" });
  assert.equal(parsed.login, "admin");
  assert.equal(loginSchema.safeParse({ login: "", password: "x" }).success, false);
  assert.equal(loginSchema.safeParse({ login: "a" }).success, false);
});

test("createUserSchema: нормалізує логін і перевіряє пароль та роль", () => {
  const ok = createUserSchema.parse({
    login: " Olena.Parent ",
    password: "Str0ng#Pass",
    role: "parent",
  });
  assert.equal(ok.login, "olena.parent");

  const bad = (patch) =>
    createUserSchema.safeParse({ login: "olena", password: "Str0ng#Pass", role: "parent", ...patch })
      .success;

  assert.equal(bad({ password: "short" }), false);
  assert.equal(bad({ password: "я".repeat(37) }), false); // 74 байти > 72
  assert.equal(bad({ role: "superuser" }), false);
  assert.equal(bad({ login: "ab" }), false);
  assert.equal(bad({ login: "bad login!" }), false);
});
