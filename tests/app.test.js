import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("GET /health повертає ok", async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  } finally {
    server.close();
  }
});
