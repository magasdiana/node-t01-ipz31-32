import test from "node:test";
import assert from "node:assert/strict";

import { createParentScope } from "../src/middleware/parentScope.js";
import { ROLES } from "../src/config/roles.js";
import { NotFoundError, ForbiddenError } from "../src/lib/errors.js";

const parent = { id: 1, role: ROLES.PARENT };

function createMockOwnership() {
  return {
    assertOwnsChild: async (user, id) => {
      if (id !== 10) throw new NotFoundError();
    },
    assertOwnsGroup: async (user, id) => {
      if (id !== 100) throw new NotFoundError();
    },
    assertParentMayPatch: (user, body) => {
      if (Object.keys(body ?? {}).some((key) => key !== "preferences")) {
        throw new ForbiddenError();
      }
    },
  };
}

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err ?? null));
  });
}

test("childParam пропускає власну дитину", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.childParam(), {
    user: parent,
    params: { id: "10" },
  });

  assert.equal(err, null);
});

test("childParam передає 404 для чужої дитини", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.childParam(), {
    user: parent,
    params: { id: "20" },
  });

  assert.ok(err instanceof NotFoundError);
});

test("groupParam пропускає власну групу", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.groupParam(), {
    user: parent,
    params: { id: "100" },
  });

  assert.equal(err, null);
});

test("groupParam передає 404 для чужої групи", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.groupParam(), {
    user: parent,
    params: { id: "200" },
  });

  assert.ok(err instanceof NotFoundError);
});

test("patchChild пропускає preferences", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.patchChild, {
    user: parent,
    params: { id: "10" },
    body: { preferences: { notifications: true } },
  });

  assert.equal(err, null);
});

test("patchChild передає 403 для заборонених полів", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.patchChild, {
    user: parent,
    params: { id: "10" },
    body: { groupId: 200 },
  });

  assert.ok(err instanceof ForbiddenError);
});

test("patchChild спочатку перевіряє власність дитини", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.patchChild, {
    user: parent,
    params: { id: "20" },
    body: { groupId: 200 },
  });

  assert.ok(err instanceof NotFoundError);
});

test("некоректний ID передається далі для валідації", async () => {
  const scope = createParentScope(createMockOwnership());
  const err = await runMiddleware(scope.childParam(), {
    user: parent,
    params: { id: "abc" },
  });

  assert.equal(err, null);
});
