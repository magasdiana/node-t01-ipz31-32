import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test(
  "mass operations create audit history with request context",
  {
    skip: !process.env.TEST_DATABASE_URL
      ? "TEST_DATABASE_URL is not configured"
      : false,
  },
  async (t) => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

    const [{ prisma }, { withRequestContext }, contextApi] = await Promise.all([
      import("../src/lib/prisma.js"),
      import("../src/lib/requestContextTransaction.js"),
      import("../src/lib/requestContext.js"),
    ]);

    t.after(async () => {
      await prisma.$disconnect();

      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    });

    await prisma.$connect();

    const marker = randomUUID();
    const actor = { id: 999999, role: "TEST" };

    function runInRequest(callback) {
      return new Promise((resolve, reject) => {
        const response = {
          setHeader() {},
        };

        contextApi.requestContextMiddleware({}, response, () => {
          Promise.resolve().then(callback).then(resolve, reject);
        });
      });
    }

    async function runBulkOperation(operation) {
      let context;

      const result = await runInRequest(async () => {
        contextApi.setActor(actor);
        context = contextApi.getContext();

        return withRequestContext(operation);
      });

      return { context, result };
    }

    async function findAuditEntries(requestId, ids, action) {
      const entries = await prisma.historyEntry.findMany();

      return entries
        .map((entry) => entry.data)
        .filter(
          (data) =>
            data &&
            data.requestId === requestId &&
            ids.includes(data.entityId) &&
            data.action === action,
        );
    }

    try {
      // 1. CREATE MANY
      const created = await runBulkOperation((tx) =>
        tx.subject.createMany({
          data: [
            { data: { auditTestKey: marker, index: 1 } },
            { data: { auditTestKey: marker, index: 2 } },
          ],
        }),
      );

      assert.equal(created.result.count, 2);

      const subjects = await prisma.subject.findMany();
      const subjectIds = subjects
        .filter((row) => row.data?.auditTestKey === marker)
        .map((row) => row.id);

      assert.equal(subjectIds.length, 2);

      const createEntries = await findAuditEntries(
        created.context.requestId,
        subjectIds,
        "create",
      );

      assert.equal(createEntries.length, 2);

      for (const entry of createEntries) {
        assert.deepEqual(entry.actor, actor);
        assert.equal(entry.source, "api");
        assert.equal(entry.requestId, created.context.requestId);
      }

      // 2. UPDATE MANY
      const updated = await runBulkOperation((tx) =>
        tx.subject.updateMany({
          where: { id: { in: subjectIds } },
          data: {
            data: {
              auditTestKey: marker,
              status: "updated",
            },
          },
        }),
      );

      assert.equal(updated.result.count, 2);

      const updateEntries = await findAuditEntries(
        updated.context.requestId,
        subjectIds,
        "update",
      );

      assert.equal(updateEntries.length, 2);

      for (const entry of updateEntries) {
        assert.deepEqual(entry.actor, actor);
        assert.equal(entry.source, "api");
        assert.equal(entry.requestId, updated.context.requestId);
      }

      // 3. DELETE MANY
      const deleted = await runBulkOperation((tx) =>
        tx.subject.deleteMany({
          where: { id: { in: subjectIds } },
        }),
      );

      assert.equal(deleted.result.count, 2);

      const deleteEntries = await findAuditEntries(
        deleted.context.requestId,
        subjectIds,
        "delete",
      );

      assert.equal(deleteEntries.length, 2);

      for (const entry of deleteEntries) {
        assert.deepEqual(entry.actor, actor);
        assert.equal(entry.source, "api");
        assert.equal(entry.requestId, deleted.context.requestId);
      }

      assert.notEqual(created.context.requestId, updated.context.requestId);
      assert.notEqual(updated.context.requestId, deleted.context.requestId);
    } finally {
      // Видаляємо залишки тестових записів, якщо тест завершився помилкою.
      const remaining = await prisma.subject.findMany();
      const remainingIds = remaining
        .filter((row) => row.data?.auditTestKey === marker)
        .map((row) => row.id);

      if (remainingIds.length > 0) {
        await withRequestContext((tx) =>
          tx.subject.deleteMany({
            where: { id: { in: remainingIds } },
          }),
        );
      }
    }
  },
);
