import test from "node:test";
import assert from "node:assert/strict";

import { ROLES } from "../src/config/roles.js";
import { createOwnership } from "../src/lib/ownership.js";
import { ForbiddenError, NotFoundError } from "../src/lib/errors.js";

const parent1 = { id: 1, role: ROLES.PARENT };
const admin = { id: 99, role: ROLES.ADMIN };

const children = [
  { id: 10, parentId: 1, groupId: 100 },
  { id: 11, parentId: 1, groupId: 101 },
  { id: 20, parentId: 2, groupId: 200 },
];

const ownership = createOwnership({
  childrenOf: async (parentId) =>
    children
      .filter((child) => child.parentId === parentId)
      .map(({ id, groupId }) => ({ id, groupId })),

  childById: async (id) => {
    const child = children.find((item) => item.id === id);
    return child
      ? { id: child.id, parentId: child.parentId }
      : null;
  },
});

test("Parent отримує ID лише власних дітей", async () => {
  assert.deepEqual(await ownership.ownedChildIds(parent1), [10, 11]);
});

test("Parent отримує лише групи власних дітей", async () => {
  assert.deepEqual(await ownership.ownedGroupIds(parent1), [100, 101]);
});

test("Parent має доступ до власної дитини", async () => {
  assert.equal(await ownership.ownsChild(parent1, 10), true);
});

test("Parent не має доступу до чужої дитини", async () => {
  assert.equal(await ownership.ownsChild(parent1, 20), false);
});

test("Доступ до чужої дитини повертає 404", async () => {
  await assert.rejects(
    ownership.assertOwnsChild(parent1, 20),
    NotFoundError,
  );
});

test("Parent має доступ до групи своєї дитини", async () => {
  await assert.doesNotReject(
    ownership.assertOwnsGroup(parent1, 100),
  );
});

test("Parent не має доступу до чужої групи — 404", async () => {
  await assert.rejects(
    ownership.assertOwnsGroup(parent1, 200),
    NotFoundError,
  );
});

test("Parent може змінювати лише preferences", () => {
  assert.doesNotThrow(() =>
    ownership.assertParentMayPatch(parent1, {
      preferences: { notifications: true },
    }),
  );
});

test("Parent не може змінювати заборонені поля — 403", () => {
  assert.throws(
    () =>
      ownership.assertParentMayPatch(parent1, {
        groupId: 200,
      }),
    ForbiddenError,
  );
});

test("Parent не може змішувати preferences із забороненими полями", () => {
  assert.throws(
    () =>
      ownership.assertParentMayPatch(parent1, {
        preferences: { notifications: true },
        role: ROLES.ADMIN,
      }),
    ForbiddenError,
  );
});

test("Список дітей фільтрується за власником Parent", async () => {
  const items = [
    { id: 10 },
    { id: 11 },
    { id: 20 },
  ];

  const result = await ownership.filterByChild(
    parent1,
    items,
    (child) => child.id,
  );

  assert.deepEqual(result, [{ id: 10 }, { id: 11 }]);
});

test("Admin не обмежується Parent ownership", async () => {
  assert.equal(await ownership.ownsChild(admin, 20), true);

  assert.deepEqual(
    await ownership.filterByChild(
      admin,
      [{ id: 10 }, { id: 20 }],
      (child) => child.id,
    ),
    [{ id: 10 }, { id: 20 }],
  );
});
