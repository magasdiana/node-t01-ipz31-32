import { test } from "node:test";
import assert from "node:assert/strict";
import { generateScheduleSchema } from "../src/modules/schedules/schedules.schema.js";

const parse = (body) =>
  generateScheduleSchema.safeParse({ body, params: {}, query: {} });

test("без тіла запит валідний: розклад для всіх груп", () => {
  assert.equal(parse(undefined).success, true);
});

test("порожній groupIds відхиляється", () => {
  assert.equal(parse({ groupIds: [] }).success, false);
});

test("groupIds з нулем або від’ємним числом відхиляється", () => {
  assert.equal(parse({ groupIds: [0] }).success, false);
  assert.equal(parse({ groupIds: [-1] }).success, false);
});

test("коректний groupIds проходить", () => {
  assert.equal(parse({ groupIds: [1, 2] }).success, true);
});
