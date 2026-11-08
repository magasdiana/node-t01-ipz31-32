import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historyEntrySchema,
  maskSensitive,
  changedFields,
  entityName,
  buildHistoryEntry,
} from "../src/lib/historySchema.js";

const entry = {
  entity: "child",
  entityId: 12,
  action: "create",
  changes: { before: null, after: { id: 12, data: { name: "Іра" } } },
  changedFields: [],
  createdAt: "2026-10-21T09:00:00.000Z",
  requestId: "req-1",
  actor: null,
  source: "api",
};

test("валідний запис create проходить", () => {
  assert.equal(historyEntrySchema.safeParse(entry).success, true);
});

test("update без before відхиляється", () => {
  const bad = { ...entry, action: "update", changes: { before: null, after: { id: 12 } } };
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("delete з after відхиляється", () => {
  const bad = { ...entry, action: "delete", changes: { before: { id: 12 }, after: { id: 12 } } };
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("upsert без after відхиляється", () => {
  const bad = { ...entry, action: "upsert", changes: { before: null, after: null } };
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("upsert зі створенням (before null) проходить", () => {
  const ok = { ...entry, action: "upsert", changes: { before: null, after: { id: 12 } } };
  assert.equal(historyEntrySchema.safeParse(ok).success, true);
});

test("запис без changes відхиляється", () => {
  const { changes, ...bad } = entry;
  assert.equal(historyEntrySchema.safeParse(bad).success, false);
});

test("невідомий action відхиляється", () => {
  assert.equal(historyEntrySchema.safeParse({ ...entry, action: "restore" }).success, false);
});

test("entityId рядком відхиляється", () => {
  assert.equal(historyEntrySchema.safeParse({ ...entry, entityId: "12" }).success, false);
});

test("createdAt не в форматі ISO відхиляється", () => {
  assert.equal(historyEntrySchema.safeParse({ ...entry, createdAt: "21.10.2026" }).success, false);
});

test("entityName: перша літера мала", () => {
  assert.equal(entityName("Child"), "child");
  assert.equal(entityName("Group"), "group");
  assert.equal(entityName("PriceSettings"), "priceSettings");
  assert.equal(entityName("StaffSubject"), "staffSubject");
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

test("buildHistoryEntry: створення дитини", () => {
  const e = buildHistoryEntry({
    model: "Child",
    operation: "create",
    before: null,
    after: { id: 12, groupId: 3, data: { name: "Іра" } },
    context: { requestId: "r1", source: "api" },
  });
  assert.equal(e.entity, "child");
  assert.equal(e.entityId, 12);
  assert.equal(e.action, "create");
  assert.equal(e.changes.before, null);
  assert.equal(e.changes.after.id, 12);
  assert.equal(e.requestId, "r1");
  assert.equal(e.actor, null);
  assert.match(e.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("buildHistoryEntry: для delete id береться зі знімка «до»", () => {
  const e = buildHistoryEntry({
    model: "Group",
    operation: "delete",
    before: { id: 7, data: { name: "Сонечко" } },
    after: null,
  });
  assert.equal(e.entity, "group");
  assert.equal(e.entityId, 7);
  assert.equal(e.changes.after, null);
});

test("buildHistoryEntry: update дає змінені поля й повний стан після", () => {
  const before = { id: 1, groupId: 2, data: { a: 1 } };
  const after = { id: 1, groupId: 3, data: { a: 1 } };
  const e = buildHistoryEntry({ model: "Child", operation: "update", before, after });
  assert.deepEqual(e.changedFields, ["groupId"]);
  assert.deepEqual(e.changes.after, after);
});

test("buildHistoryEntry: passwordHash замаскований в обох знімках", () => {
  const e = buildHistoryEntry({
    model: "User",
    operation: "update",
    before: { id: 1, data: { passwordHash: "a" } },
    after: { id: 1, data: { passwordHash: "b" } },
  });
  assert.equal(e.changes.before.data.passwordHash, "***");
  assert.equal(e.changes.after.data.passwordHash, "***");
});

test("buildHistoryEntry: без контексту requestId генерується, source api, actor null", () => {
  const e = buildHistoryEntry({ model: "Group", operation: "create", before: null, after: { id: 1 } });
  assert.equal(typeof e.requestId, "string");
  assert.ok(e.requestId.length > 0);
  assert.equal(e.source, "api");
  assert.equal(e.actor, null);
});