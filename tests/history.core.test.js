import { test } from "node:test";
import assert from "node:assert/strict";
import { historyEntrySchema, maskSensitive, changedFields } from "../src/lib/historySchema.js";

const entry = {
  entity: "children",
  entityId: 5,
  action: "create",
  before: null,
  after: { id: 5, data: { name: "Іра" } },
  changedFields: [],
  actor: null,
  source: "api",
  requestId: "req-1",
  changedAt: "2026-11-05T10:00:00.000Z",
};

test("валідний запис create проходить", () => {
  assert.equal(historyEntrySchema.safeParse(entry).success, true);
});

test("update без before відхиляється", () => {
  const bad = { ...entry, action: "update", before: null };
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("delete з after відхиляється", () => {
  const bad = { ...entry, action: "delete", before: { id: 5 }, after: { id: 5 } };
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("запис без обов'язкового поля відхиляється", () => {
  const { entity, ...bad } = entry;
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("невідомий action відхиляється", () => {
  assert.equal(historyEntrySchema.safeParse({ ...entry, action: "restore" }).success, false);
});

test("maskSensitive маскує passwordHash на будь-якій глибині", () => {
  const masked = maskSensitive({ id: 1, data: { login: "a", passwordHash: "xyz" } });
  assert.equal(masked.data.passwordHash, "***");
  assert.equal(masked.data.login, "a");
});

test("changedFields повертає лише змінені поля", () => {
  const fields = changedFields({ id: 1, groupId: 2, data: { a: 1 } }, { id: 1, groupId: 3, data: { a: 1 } });
  assert.deepEqual(fields, ["groupId"]);
});