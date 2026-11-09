import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getContext,
  setActor,
  requestContextMiddleware,
} from "../src/lib/requestContext.js";

function runInRequest(callback) {
  return new Promise((resolve, reject) => {
    const headers = {};

    const response = {
      setHeader(name, value) {
        headers[name] = value;
      },
    };

    requestContextMiddleware({}, response, () => {
      Promise.resolve()
        .then(() => callback(headers))
        .then(resolve, reject);
    });
  });
}

test("getContext returns an empty context outside a request", () => {
  assert.deepEqual(getContext(), {
    requestId: null,
    actor: null,
    source: null,
  });
});

test("middleware creates a unique request ID and sets API source", async () => {
  const result = await runInRequest((headers) => ({
    context: getContext(),
    requestIdHeader: headers["X-Request-Id"],
  }));

  assert.match(
    result.context.requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );

  assert.equal(result.context.actor, null);
  assert.equal(result.context.source, "api");
  assert.equal(result.requestIdHeader, result.context.requestId);
});

test("setActor stores only user ID and role", async () => {
  const context = await runInRequest(() => {
    setActor({
      id: 12,
      role: "ADMIN",
      passwordHash: "secret",
      email: "admin@example.com",
    });

    return getContext();
  });

  assert.deepEqual(context.actor, {
    id: 12,
    role: "ADMIN",
  });
});

test("setActor can clear the current actor", async () => {
  const context = await runInRequest(() => {
    setActor({ id: 12, role: "ADMIN" });
    setActor(null);

    return getContext();
  });

  assert.equal(context.actor, null);
});

test("setActor rejects invalid actor data", async () => {
  await runInRequest(() => {
    assert.throws(
      () => setActor({ id: "12", role: "ADMIN" }),
      /valid numeric id and role/,
    );

    assert.throws(() => setActor({ id: 12 }), /valid numeric id and role/);

    assert.equal(getContext().actor, null);
  });
});

test("setActor cannot be called outside an active request", () => {
  assert.throws(
    () => setActor({ id: 1, role: "ADMIN" }),
    /outside an active request context/,
  );
});

test("getContext does not expose mutable internal actor data", async () => {
  const actor = await runInRequest(() => {
    setActor({ id: 12, role: "ADMIN" });

    const context = getContext();
    context.actor.id = 999;

    return getContext().actor;
  });

  assert.deepEqual(actor, {
    id: 12,
    role: "ADMIN",
  });
});

test("parallel requests have isolated contexts", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      runInRequest(async () => {
        setActor({
          id: index + 1,
          role: `ROLE_${index + 1}`,
        });

        await new Promise((resolve) => setTimeout(resolve, index * 5));

        return getContext();
      }),
    ),
  );

  const requestIds = results.map((result) => result.requestId);

  assert.equal(new Set(requestIds).size, 5);

  results.forEach((result, index) => {
    assert.equal(result.actor.id, index + 1);
    assert.equal(result.actor.role, `ROLE_${index + 1}`);
    assert.equal(result.source, "api");
  });
});
