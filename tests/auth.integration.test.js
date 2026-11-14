import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Потрібна база з застосованими міграціями (в т.ч. users_auth і
// history_password_change). Запуск:
//   TEST_DATABASE_URL=postgresql://... npm test
// Без змінної тест пропускається, як і history.mass.integration.test.js.
test(
  "users у БД: унікальний логін, CHECK на хеш, історія з *** та actor",
  {
    skip: !process.env.TEST_DATABASE_URL
      ? "TEST_DATABASE_URL is not configured"
      : false,
  },
  async (t) => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.BCRYPT_ROUNDS = "4";

    const [{ prisma }, { withRequestContext }, contextApi, { hashPassword }] =
      await Promise.all([
        import("../src/lib/prisma.js"),
        import("../src/lib/requestContextTransaction.js"),
        import("../src/lib/requestContext.js"),
        import("../src/lib/password.js"),
      ]);

    t.after(async () => {
      await prisma.$disconnect();
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    });

    await prisma.$connect();

    const actor = { id: 999999, role: "admin" };
    const login = `it-${randomUUID().slice(0, 12)}`;
    const hash = await hashPassword("Test#Pass1");
    const otherHash = await hashPassword("Other#Pass2");
    let userId = null;

    // Імітує запит: контекст + actor, далі транзакція з set_config
    function asRequest(operation) {
      return new Promise((resolve, reject) => {
        contextApi.requestContextMiddleware({}, { setHeader() {} }, () => {
          Promise.resolve()
            .then(() => {
              contextApi.setActor(actor);
              return withRequestContext(operation);
            })
            .then(resolve, reject);
        });
      });
    }

    const historyFor = (id) =>
      prisma.historyEntry.findMany({
        where: {
          AND: [
            { data: { path: ["entity"], equals: "user" } },
            { data: { path: ["entityId"], equals: id } },
          ],
        },
        orderBy: { id: "asc" },
      });

    try {
      // 1. Створення: запис є, в історії passwordHash = ***, actor заповнений
      const created = await asRequest((tx) =>
        tx.user.create({ data: { data: { login, passwordHash: hash, role: "parent" } } }),
      );
      userId = created.id;

      let entries = await historyFor(userId);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].data.action, "create");
      assert.equal(entries[0].data.changes.after.data.passwordHash, "***");
      assert.equal(entries[0].data.changes.after.data.login, login);
      assert.deepEqual(entries[0].data.actor, actor);
      assert.ok(!JSON.stringify(entries[0].data).includes(hash), "хеш у history");

      // 2. Дублікат логіна блокується на рівні БД
      await assert.rejects(
        () => prisma.user.create({ data: { data: { login, passwordHash: otherHash, role: "teacher" } } }),
        "дублікат login має бути відхилений унікальним індексом",
      );

      // 3. Відкритий пароль у passwordHash відхиляє CHECK (NFR-02)
      await assert.rejects(
        () => prisma.user.create({ data: { data: { login: `${login}-p`, passwordHash: "plain-password", role: "parent" } } }),
        "відкритий пароль не має потрапляти в БД",
      );

      // 4. Логін не в нижньому регістрі відхиляє CHECK
      await assert.rejects(
        () => prisma.user.create({ data: { data: { login: `X-${login}`.toUpperCase(), passwordHash: hash, role: "parent" } } }),
      );

      // 5. Зміна ролі: запис update, passwordHash у знімках ***
      await asRequest((tx) =>
        tx.user.update({
          where: { id: userId },
          data: { data: { login, passwordHash: hash, role: "manager" } },
        }),
      );
      entries = await historyFor(userId);
      assert.equal(entries.at(-1).data.action, "update");
      assert.equal(entries.at(-1).data.changes.before.data.role, "parent");
      assert.equal(entries.at(-1).data.changes.after.data.role, "manager");
      assert.equal(entries.at(-1).data.changes.after.data.passwordHash, "***");

      // 6. Зміна ЛИШЕ пароля теж лишає запис в історії (міграція history_password_change)
      const before = entries.length;
      await asRequest((tx) =>
        tx.user.update({
          where: { id: userId },
          data: { data: { login, passwordHash: otherHash, role: "manager" } },
        }),
      );
      entries = await historyFor(userId);
      assert.equal(entries.length, before + 1, "зміна пароля не потрапила в історію");
      assert.deepEqual(entries.at(-1).data.changedFields, ["data"]);
      assert.equal(entries.at(-1).data.changes.after.data.passwordHash, "***");
      assert.ok(!JSON.stringify(entries.at(-1).data).includes(otherHash));

      // 7. Видалення: запис delete з actor
      await asRequest((tx) => tx.user.delete({ where: { id: userId } }));
      userId = null;
      entries = await historyFor(created.id);
      assert.equal(entries.at(-1).data.action, "delete");
      assert.equal(entries.at(-1).data.changes.before.data.passwordHash, "***");
      assert.deepEqual(entries.at(-1).data.actor, actor);

      // 8. T1–T6: у users лише id і data
      const columns = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND table_schema = current_schema()
        ORDER BY column_name
      `;
      assert.deepEqual(columns.map((c) => c.column_name), ["data", "id"]);
    } finally {
      // Прибираємо користувача, якщо тест впав посередині (історія незмінна й лишається)
      if (userId !== null) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => {});
      }
    }
  },
);
