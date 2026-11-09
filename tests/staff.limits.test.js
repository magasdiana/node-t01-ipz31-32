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

// Підставний прибуток: рахує, скільки разів його запитали
function fakeProfit(value) {
  const state = { calls: 0 };
  state.getProfit = async () => {
    state.calls += 1;
    return value;
  };
  return state;
}

function checker(counts, profit) {
  const repo = fakeRepo(counts);
  const p = fakeProfit(profit);
  return {
    repo,
    profit: p,
    check: createTeacherLimitChecker({ staffRepository: repo, getProfit: p.getProfit }),
  };
}

// ---------- чиста функція ----------

test('findOverLimit: гурток із 3 викладачами заповнений, з 2 ще ні', () => {
  const counts = new Map([[1, 3], [2, 2]]);
  assert.deepEqual(findOverLimit(counts, [1, 2], 3), [
    { subjectId: 1, current: 3, max: 3 },
  ]);
});

test('findOverLimit: гурток без викладачів не заповнений', () => {
  assert.deepEqual(findOverLimit(new Map(), [5], 3), []);
});

// ---------- FR-15: до 3 викладачів, прибуток не потрібен ----------

test('FR-15: третій викладач на гурток дозволений і прибуток не запитується', async () => {
  const { check, profit } = checker({ 1: 2 }, -1_000_000);
  await check([1], { extraSalary: 40000 });
  assert.equal(profit.calls, 0);
});

test('FR-15: порожній список гуртків не звертається ні до бази, ні до прибутку', async () => {
  const { check, repo, profit } = checker({}, 0);
  await check([]);
  await check(undefined);
  assert.equal(repo.calls.length, 0);
  assert.equal(profit.calls, 0);
});

test('гурток, до якого викладач уже прив\'язаний, не перевіряється', async () => {
  const { check, repo, profit } = checker({ 1: 9 }, 0);
  // викладач уже серед тих дев'яти; PATCH із тим самим списком не має падати
  await check([1], { staffId: 7, alreadyLinked: [1] });
  assert.equal(repo.calls.length, 0);
  assert.equal(profit.calls, 0);
});

test('при оновленні перевіряються лише нові гуртки і передається staffId', async () => {
  const { check, repo } = checker({ 2: 1 }, 0);
  await check([1, 2], { staffId: 7, alreadyLinked: [1] });
  assert.deepEqual(repo.calls, [{ subjectIds: [2], excludeStaffId: 7 }]);
});

// ---------- FR-16: 4–9 викладачів лише за додатного прибутку ----------

test('FR-16: четвертий викладач дозволений, якщо прибуток після збільшення додатний', async () => {
  const { check } = checker({ 1: 3 }, 100000);
  await check([1], { extraSalary: 40000 }); // 100000 - 40000 = 60000 > 0
});

test('FR-16: четвертий викладач відхиляється, якщо прибуток після збільшення від\'ємний', async () => {
  const { check } = checker({ 1: 3 }, 30000);
  await assert.rejects(
    () => check([1], { extraSalary: 40000 }), // 30000 - 40000 = -10000
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.equal(err.status, 409);
      assert.equal(err.details.profitBefore, 30000);
      assert.equal(err.details.extraSalary, 40000);
      assert.equal(err.details.profitAfter, -10000);
      assert.deepEqual(err.details.subjects, [{ subjectId: 1, current: 3, max: 3 }]);
      return true;
    },
  );
});

test('FR-16: нульовий прибуток після збільшення не дозволяє (потрібен строго додатний)', async () => {
  const { check } = checker({ 1: 3 }, 40000);
  await assert.rejects(() => check([1], { extraSalary: 40000 }), ConflictError);
});

test('FR-16: якщо прибуток уже від\'ємний, збільшення відхиляється', async () => {
  const { check } = checker({ 1: 3 }, -500000);
  await assert.rejects(() => check([1], { extraSalary: 40000 }), ConflictError);
});

test('FR-16: сьомий викладач (×3) дозволений за додатного прибутку', async () => {
  const { check } = checker({ 1: 6 }, 100000);
  await check([1], { extraSalary: 40000 });
});

test('FR-16: дев\'ятий викладач дозволений за додатного прибутку', async () => {
  const { check } = checker({ 1: 8 }, 100000);
  await check([1], { extraSalary: 40000 });
});

test('FR-16: десятий викладач відхиляється завжди, навіть за величезного прибутку', async () => {
  const { check, profit } = checker({ 1: 9 }, 10_000_000);
  await assert.rejects(
    () => check([1], { extraSalary: 40000 }),
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.deepEqual(err.details, [{ subjectId: 1, current: 9, max: 9 }]);
      return true;
    },
  );
  assert.equal(profit.calls, 0);
});

test('FR-16: збільшення можливе в одному гуртку, а інший лишається в межах 3', async () => {
  const { check } = checker({ 1: 3, 2: 1 }, 100000);
  await check([1, 2], { extraSalary: 40000 });
});

test('FR-16: прибуток запитується один раз, навіть якщо понад 3 одразу в кількох гуртках', async () => {
  const { check, profit } = checker({ 1: 3, 2: 4 }, 100000);
  await check([1, 2], { extraSalary: 40000 });
  assert.equal(profit.calls, 1);
});

test('FR-16: достатньо одного занадто заповненого гуртка (>9) зі списку', async () => {
  const { check } = checker({ 1: 1, 2: 9 }, 10_000_000);
  await assert.rejects(() => check([1, 2], { extraSalary: 40000 }), ConflictError);
});

test('FR-16: існуючий викладач (extraSalary 0) потребує лише додатного прибутку', async () => {
  const ok = checker({ 1: 3 }, 1);
  await ok.check([1], { staffId: 7 });

  const bad = checker({ 1: 3 }, 0);
  await assert.rejects(() => bad.check([1], { staffId: 7 }), ConflictError);
});
