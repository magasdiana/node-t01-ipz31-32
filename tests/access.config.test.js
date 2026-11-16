import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS, PUBLIC_ROUTES } from '../src/config/access.js';
import { ROLES, ROLE_VALUES } from '../src/config/roles.js';

const { ADMIN, MANAGER, PARENT, TEACHER } = ROLES;

// Ключі ACCESS, до яких має доступ роль (перший шар перевірки, без «своє / чуже»)
const keysFor = (role) =>
  Object.entries(ACCESS)
    .filter(([, roles]) => roles.includes(role))
    .map(([key]) => key)
    .sort();

test('ACCESS: кожен запис містить лише відомі ролі без дублікатів', () => {
  for (const [key, roles] of Object.entries(ACCESS)) {
    assert.ok(roles.length > 0, `${key}: порожній список ролей`);
    assert.equal(new Set(roles).size, roles.length, `${key}: дублікати ролей`);
    for (const role of roles) {
      assert.ok(ROLE_VALUES.includes(role), `${key}: невідома роль ${role}`);
    }
  }
});

test('ACCESS: об\'єкт і списки заморожені', () => {
  assert.ok(Object.isFrozen(ACCESS));
  for (const roles of Object.values(ACCESS)) {
    assert.ok(Object.isFrozen(roles));
  }
});

test('ACCESS: Admin має доступ до всього', () => {
  for (const [key, roles] of Object.entries(ACCESS)) {
    assert.ok(roles.includes(ADMIN), `${key}: Admin без доступу`);
  }
});

test('ACCESS: звіти, ціни, історія, персонал, гуртки, користувачі та прогноз розкладу лише для Admin', () => {
  for (const key of [
    'REPORTS',
    'PRICES',
    'HISTORY',
    'STAFF_ALL',
    'SUBJECTS_ALL',
    'USERS',
    'SCHEDULES_GENERATE',
    'SCHEDULES_FORECAST',
  ]) {
    assert.deepEqual([...ACCESS[key]], [ADMIN], key);
  }
});

test('ACCESS Manager: діти, групи, кімнати й оплати; без звітів, цін, персоналу, історії і розкладу', () => {
  assert.deepEqual(keysFor(MANAGER), [
    'CHILDREN_CREATE',
    'CHILDREN_DELETE',
    'CHILDREN_INVOICE',
    'CHILDREN_READ',
    'CHILDREN_UPDATE',
    'GROUPS_READ',
    'GROUPS_WRITE',
    'PAYMENTS_CREATE',
    'PAYMENTS_READ',
    'ROOMS_READ',
  ]);
});

test('ACCESS Parent: лише читання дитини, рахунку, оплат, занять групи та PATCH дитини (FR-04)', () => {
  assert.deepEqual(keysFor(PARENT), [
    'CHILDREN_INVOICE',
    'CHILDREN_READ',
    'CHILDREN_UPDATE',
    'GROUP_LESSONS',
    'PAYMENTS_READ',
  ]);
});

test('ACCESS Parent: не створює і не видаляє дітей (FR-05) і не створює оплат', () => {
  assert.ok(!ACCESS.CHILDREN_CREATE.includes(PARENT));
  assert.ok(!ACCESS.CHILDREN_DELETE.includes(PARENT));
  assert.ok(!ACCESS.PAYMENTS_CREATE.includes(PARENT));
});

test('ACCESS Teacher: власний розклад, заняття групи та зміна занять (FR-21)', () => {
  assert.deepEqual(keysFor(TEACHER), [
    'GROUP_LESSONS',
    'LESSON_UPDATE',
    'STAFF_SCHEDULE',
  ]);
});

test('PUBLIC_ROUTES: лише вхід, health і документація', () => {
  assert.deepEqual(
    [...PUBLIC_ROUTES].sort(),
    ['GET /docs', 'GET /health', 'GET /openapi.json', 'POST /auth/login'],
  );
});
