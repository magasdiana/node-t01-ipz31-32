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

// Smoke testing: перевірка доступності API

test("GET /health повертає ok", async () => {
  const response = await expectStatus("/health", {}, 200);

  assert.deepEqual(await response.json(), { status: "ok" });
});

// Positive testing 
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

// Negative testing: 
for (const [method, path] of [
  ["POST", "/staff"],
  ["POST", "/subjects"],
  ["POST", "/payments"],
  ["PUT", "/settings/prices"],
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
