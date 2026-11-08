import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findOverLimit,
  createTeacherLimitChecker,
} from '../src/modules/staff/staff.limits.js';
import { ConflictError } from '../src/lib/errors.js';

// Підставний репозиторій: counts — скільки викладачів уже на кожному гуртку
function fakeRepo(counts) {
  const calls = [];
  return {
    calls,
    async countTeachersBySubject(subjectIds, excludeStaffId) {
      calls.push({ subjectIds, excludeStaffId });
      return new Map(Object.entries(counts).map(([k, v]) => [Number(k), v]));
    },
  };
}

test('findOverLimit: гурток із 3 викладачами заповнений, з 2 ще ні', () => {
  const counts = new Map([[1, 3], [2, 2]]);
  assert.deepEqual(findOverLimit(counts, [1, 2], 3), [
    { subjectId: 1, current: 3, max: 3 },
  ]);
});

test('findOverLimit: гурток без викладачів не заповнений', () => {
  assert.deepEqual(findOverLimit(new Map(), [5], 3), []);
});

test('FR-15: третій викладач на гурток дозволений', async () => {
  const check = createTeacherLimitChecker({ staffRepository: fakeRepo({ 1: 2 }) });
  await check([1]);
});

test('FR-15: четвертий викладач на гурток відхиляється з 409', async () => {
  const check = createTeacherLimitChecker({ staffRepository: fakeRepo({ 1: 3 }) });
  await assert.rejects(
    () => check([1]),
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.equal(err.status, 409);
      assert.deepEqual(err.details, [{ subjectId: 1, current: 3, max: 3 }]);
      return true;
    },
  );
});

test('FR-15: достатньо одного заповненого гуртка зі списку', async () => {
  const check = createTeacherLimitChecker({ staffRepository: fakeRepo({ 1: 1, 2: 3 }) });
  await assert.rejects(() => check([1, 2]), ConflictError);
});

test('FR-15: порожній список гуртків не звертається до бази', async () => {
  const repo = fakeRepo({});
  const check = createTeacherLimitChecker({ staffRepository: repo });
  await check([]);
  await check(undefined);
  assert.equal(repo.calls.length, 0);
});

test('FR-15: гурток, до якого викладач уже прив\'язаний, не перевіряється', async () => {
  const repo = fakeRepo({ 1: 3 });
  const check = createTeacherLimitChecker({ staffRepository: repo });
  // викладач уже серед тих трьох на гуртку 1; PATCH із тим самим списком не має падати
  await check([1], { staffId: 7, alreadyLinked: [1] });
  assert.equal(repo.calls.length, 0);
});

test('FR-15: при оновленні перевіряються лише нові гуртки і передається staffId', async () => {
  const repo = fakeRepo({ 2: 1 });
  const check = createTeacherLimitChecker({ staffRepository: repo });
  await check([1, 2], { staffId: 7, alreadyLinked: [1] });
  assert.deepEqual(repo.calls, [{ subjectIds: [2], excludeStaffId: 7 }]);
});

test('ліміт можна підняти параметром max (для FR-16)', async () => {
  const check = createTeacherLimitChecker({
    staffRepository: fakeRepo({ 1: 3 }),
    max: 6,
  });
  await check([1]);
});
