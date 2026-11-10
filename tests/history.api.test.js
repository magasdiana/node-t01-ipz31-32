import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";

import { createHistoryService } from "../src/modules/history/history.service.js";
import { createHistoryController } from "../src/modules/history/history.controller.js";
import {
  createHistoryRouter,
  createEntityHistoryRouter,
} from "../src/modules/history/history.routes.js";
import { notFound, errorHandler } from "../src/middleware/errorHandler.js";
import { NotFoundError } from "../src/lib/errors.js";


const entry = (id, entity, entityId, action, createdAt) => ({
  id,
  data: {
    entity,
    entityId,
    action,
    createdAt,
    changes: {
      after: action === "delete"
        ? null
        : { id: entityId, name: "Test" },
    },
  },
});


const fixtures = [
  entry(1, "child", 1, "create", "2026-10-01T09:00:00.000Z"),
  entry(2, "child", 1, "update", "2026-10-05T09:00:00.000Z"),
  entry(3, "group", 1, "create", "2026-10-10T09:00:00.000Z"),
  entry(4, "child", 2, "update", "2026-10-15T09:00:00.000Z"),
  entry(5, "child", 1, "delete", "2026-10-20T09:00:00.000Z"),
];

// Те саме, що робить справжній репозиторій, але над масивом

const fakeRepository = {
  async findMany({ entity, entityId, action, from, to, limit, offset, sort }) {
    let rows = fixtures
      .filter((r) => entity === undefined || r.data.entity === entity)
      .filter((r) => entityId === undefined || r.data.entityId === entityId)
      .filter((r) => action === undefined || r.data.action === action)
      .filter((r) => !from || r.data.createdAt >= `${from}T00:00:00.000Z`)
      .filter((r) => !to || r.data.createdAt <= `${to}T23:59:59.999Z`)
      .sort((a, b) => sort === "asc" ? a.id - b.id : b.id - a.id);

    const total = rows.length;

    if (offset !== undefined || limit !== undefined) {
      const start = offset ?? 0;
      rows = rows.slice(
        start,
        limit === undefined ? undefined : start + limit
      );
    }

    return { items: rows, total };
  },

  async findById(id) {
    return fixtures.find((r) => r.id === id) ?? null;
  },

  async count() {
    return fixtures.length;
  },

  async findLast() {
    return [...fixtures].sort((a, b) => b.id - a.id)[0] ?? null;
  },
};


const exists = (kind, ids) => async (id) => {
  if (!ids.includes(id)) throw new NotFoundError(`${kind} не знайдено`);
};

function makeApp() {
  const service = createHistoryService({
    historyRepository: fakeRepository,
    entityChecks: {
      child: exists("Дитину", [1, 2]),
      group: exists("Групу", [1]),
    },
  });
  const controller = createHistoryController(service);

  const app = express();
  app.use(express.json());
  app.use("/history", createHistoryRouter(controller));
  app.use("/children", createEntityHistoryRouter(controller, "child"));
  app.use("/groups", createEntityHistoryRouter(controller, "group"));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

async function call(path, options) {
  const server = makeApp().listen(0);
  await once(server, "listening");
  try {
    const res = await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      options,
    );
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test("GET /history: нові зверху, є total, limit і offset", async () => {
  const { status, body } = await call("/history");
  assert.equal(status, 200);
  assert.deepEqual(
    body.items.map((i) => i.id),
    [5, 4, 3, 2, 1],
  );
  assert.equal(body.total, 5);
  assert.equal(body.limit, 50);
  assert.equal(body.offset, 0);
  assert.equal(body.items[0].entity, "child"); // data розгорнуто у відповідь
});

test("фільтри entity, entityId, action", async () => {
  let r = await call("/history?entity=group");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [3],
  );

  r = await call("/history?entity=child&entityId=1");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [5, 2, 1],
  );

  r = await call("/history?action=update");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [4, 2],
  );
});

test("фільтр за датою from/to включно", async () => {
  const r = await call("/history?from=2026-10-05&to=2026-10-15");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [4, 3, 2],
  );
});

test("limit і offset діляють результат на сторінки", async () => {
  const r = await call("/history?limit=2&offset=1");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [4, 3],
  );
  assert.equal(r.body.total, 5);
});

test("невалідний фільтр дає 400 в єдиному форматі", async () => {
  const bad = [
    "/history?action=explode",
    "/history?from=2026-13-40",
    "/history?from=2026-10-20&to=2026-10-01",
    "/history?limit=0",
    "/history?limit=201",
    "/history?offset=-1",
    "/history?entityId=abc",
  ];
  for (const path of bad) {
    const { status, body } = await call(path);
    assert.equal(status, 400, path);
    assert.equal(body.error.status, 400, path);
  }
});

test("GET /history/state: успішне відновлення стану сутності на заданий момент часу", async () => {
  // На 2026-10-02 дитина з id 1 вже створена (1 жовтня) і оновлена (5 жовтня ще не настало)
  const { status, body } = await call("/history/state?entity=child&entityId=1&at=2026-10-02T00:00:00.000Z");
  assert.equal(status, 200);
  assert.deepEqual(body.state, { id: 1, name: "Test" });
});


test("GET /history/state: повертає 404, якщо сутність уже була видалена", async () => {
  // Дитину з id 1 видалено 20 жовтня, тому 21 жовтня її стану вже немає
  const { status } = await call(
    "/history/state?entity=child&entityId=1&at=2026-10-21T00:00:00.000Z"
  );

  assert.equal(status, 404);
});


test("GET /history/state: повертає 400 при відсутності обов'язкових параметрів", async () => {
  const { status } = await call("/history/state?entity=child");
  assert.equal(status, 400);
});

test("GET /history/:id: знайдено, не знайдено, некоректний id", async () => {
  let r = await call("/history/3");
  assert.equal(r.status, 200);
  assert.equal(r.body.id, 3);
  assert.equal(r.body.entity, "group");

  r = await call("/history/999");
  assert.equal(r.status, 404);

  r = await call("/history/abc");
  assert.equal(r.status, 400);
});

test("GET /children/:id/history: лише історія цієї дитини", async () => {
  const r = await call("/children/1/history");
  assert.equal(r.status, 200);
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [5, 2, 1],
  );

  const filtered = await call("/children/1/history?action=update");
  assert.deepEqual(
    filtered.body.items.map((i) => i.id),
    [2],
  );
});

test("GET /children/:id/history: неіснуюча дитина дає 404, поганий id дає 400", async () => {
  assert.equal((await call("/children/999/history")).status, 404);
  assert.equal((await call("/children/abc/history")).status, 400);
});

test("GET /groups/:id/history: історія групи і 404", async () => {
  const r = await call("/groups/1/history");
  assert.deepEqual(
    r.body.items.map((i) => i.id),
    [3],
  );
  assert.equal((await call("/groups/999/history")).status, 404);
});


test("GET /history/state: повертає 404, якщо сутність ще не існувала", async () => {
  // Дитину з id 1 створено 1 жовтня, тому 30 вересня її ще не існувало
  const { status } = await call(
    "/history/state?entity=child&entityId=1&at=2026-09-30T00:00:00.000Z"
  );

  assert.equal(status, 404);
});


test("історія тільки для читання: POST, PATCH, DELETE дають 404", async () => {
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const r = await call("/history/1", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : "{}",
    });
    assert.equal(r.status, 404, method);
  }
});
