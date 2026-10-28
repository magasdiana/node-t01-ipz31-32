import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function expectStatus(path, options, expectedStatus) {
  const response = await request(path, options);

  assert.equal(
    response.status,
    expectedStatus,
    `${options?.method ?? "GET"} ${path}: очікувався HTTP ${expectedStatus}, отримано ${response.status}`
  );

  return response;
}

// Smoke testing

test("GET /health повертає ok", async () => {
  const response = await expectStatus("/health", {}, 200);

  assert.deepEqual(await response.json(), { status: "ok" });
});

// Positive testing — доступність API

for (const path of [
  "/children",
  "/groups",
  "/rooms",
  "/staff",
  "/subjects",
  "/payments",
  "/settings/prices",
  "/reports/profit",
  "/reports/min-rooms",
]) {
  test(`GET ${path} повертає успішну відповідь`, async () => {
    const response = await request(path);

    assert.ok(
      response.status >= 200 && response.status < 300,
      `GET ${path}: отримано HTTP ${response.status}`
    );
  });
}

// Negative testing — перевірка валідації

for (const [method, path] of [
  ["POST", "/staff"],
  ["POST", "/subjects"],
  ["POST", "/payments"],
]) {
  test(`${method} ${path} відхиляє порожній об'єкт`, async () => {
    await expectStatus(
      path,
      {
        method,
        body: JSON.stringify({}),
      },
      400
    );
  });
}

// PR #29 — валідація налаштувань цін

test("PUT /settings/prices відхиляє порожній об'єкт", async () => {
  await expectStatus(
    "/settings/prices",
    {
      method: "PUT",
      body: JSON.stringify({}),
    },
    400
  );
});

test("PUT /settings/prices приймає коректне оновлення", async () => {
  const response = await request("/settings/prices", {
    method: "PUT",
    body: JSON.stringify({
      tuitionPerMonth: 15000,
    }),
  });

  assert.ok(
    response.status >= 200 && response.status < 300,
    `PUT /settings/prices: очікувалася успішна відповідь, отримано HTTP ${response.status}`
  );

  assert.ok(
    (response.headers.get("content-type") ?? "").includes("application/json"),
    "Оновлення цін має повертатися у форматі JSON"
  );

  await response.json();
});

// PR #31 — генерація чернетки розкладу

test("POST /schedules створює чернетку з порожнім об'єктом", async () => {
  await expectStatus(
    "/schedules",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    201
  );
});

// PR #33 — модуль занять
// Ці тести фіксують недоступність маршруту, а не працездатність модуля.

test("GET /lessons повертає 404 за недоступного маршруту", async () => {
  await expectStatus("/lessons", {}, 404);
});

test("POST /lessons повертає 404 за недоступного маршруту", async () => {
  await expectStatus(
    "/lessons",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    404
  );
});

// PR #32 — звіт про прибуток

test("GET /reports/profit повертає JSON", async () => {
  const response = await request("/reports/profit");

  assert.ok(
    response.status >= 200 && response.status < 300,
    `GET /reports/profit: отримано HTTP ${response.status}`
  );

  assert.ok(
    (response.headers.get("content-type") ?? "").includes("application/json"),
    "Звіт про прибуток має повертатися у форматі JSON"
  );

  await response.json();
});

// PR #32 — звіт про мінімальну кількість кімнат

test("GET /reports/min-rooms повертає JSON", async () => {
  const response = await request("/reports/min-rooms");

  assert.ok(
    response.status >= 200 && response.status < 300,
    `GET /reports/min-rooms: отримано HTTP ${response.status}`
  );

  assert.ok(
    (response.headers.get("content-type") ?? "").includes("application/json"),
    "Звіт про кімнати має повертатися у форматі JSON"
  );

  await response.json();
});

// PR #30 — перехід модуля персоналу на camelCase

test("GET /staff повертає JSON після переходу на camelCase", async () => {
  const response = await request("/staff");

  assert.ok(
    response.status >= 200 && response.status < 300,
    `GET /staff: отримано HTTP ${response.status}`
  );

  assert.ok(
    (response.headers.get("content-type") ?? "").includes("application/json"),
    "GET /staff має повертати JSON"
  );

  await response.json();
});
