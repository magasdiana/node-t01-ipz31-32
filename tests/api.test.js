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
      tuitionMonthly: 15000,
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

test("PUT /settings/prices відхиляє застарілі ключі", async () => {
  for (const body of [
    { tuitionPerMonth: 16000 },
    { yearlyDiscount: 15 },
    { mealPerDayByAge: { 3: 450 } },
  ]) {
    await expectStatus("/settings/prices", {
      method: "PUT",
      body: JSON.stringify(body),
    }, 400);
  }
});

test("PUT /settings/prices приймає актуальні camelCase ключі та відсотки 0–100", async () => {
  const response = await request("/settings/prices", {
    method: "PUT",
    body: JSON.stringify({
      tuitionMonthly: 16000,
      mealsPerDayByAge: { "3": 450, "4": 500 },
      benefitPercent: { NONE: 0, LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 },
      annualPaymentPercent: 15,
    }),
  });
  assert.ok(response.status >= 200 && response.status < 300,
    `Очікувався 2xx, отримано ${response.status}`);
});

test("PUT /settings/prices відхиляє відсотки поза 0–100", async () => {
  for (const body of [
    { annualPaymentPercent: -1 },
    { annualPaymentPercent: 101 },
    { benefitPercent: { LEVEL_1: -1 } },
    { benefitPercent: { LEVEL_2: 101 } },
  ]) {
    await expectStatus("/settings/prices", {
      method: "PUT",
      body: JSON.stringify(body),
    }, 400);
  }
});

// PR #31 — генерація чернетки розкладу

test("POST /schedules створює чернетку з порожнім об'єктом", async () => {
  await expectStatus(
    "/schedules",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    200
  );
});

// Актуальні маршрути занять: GET /groups/:id/lessons та PATCH /lessons/:id.
// Не тестуємо GET/POST /lessons — таких маршрутів у API немає.

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
