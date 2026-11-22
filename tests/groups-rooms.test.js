import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

let server;
let baseUrl;
let token;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Логін admin із seed (шлях і поле токена звірте зі своїм auth)
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: "admin", password: "Admin#2026" }),
  });
  assert.equal(res.status, 200, "Логін admin не вдався: спочатку виконайте seed");
  const body = await res.json();
  token = body.token ?? body.accessToken;
  assert.ok(token, "У відповіді логіну немає токена");
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function api(path, method = "GET", body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ---------- Кімнати: CRUD ----------

test("rooms: повний CRUD", async () => {
  let res = await api("/rooms", "POST", { name: `Тест кімната ${uid()}`, cost: 1000 });
  assert.equal(res.status, 201);
  const room = await res.json();

  res = await api(`/rooms/${room.id}`);
  assert.equal(res.status, 200);

  res = await api(`/rooms/${room.id}`, "PATCH", { name: `Змінена ${uid()}` });
  assert.equal(res.status, 200);

  res = await api(`/rooms/${room.id}`, "DELETE");
  assert.equal(res.status, 200);

  res = await api(`/rooms/${room.id}`);
  assert.equal(res.status, 404);
});

test("rooms: неіснуючий ID дає 404, некоректний дає 400", async () => {
  assert.equal((await api("/rooms/999999")).status, 404);
  assert.equal((await api("/rooms/abc")).status, 400);
  assert.equal((await api("/rooms", "POST", {})).status, 400);
  assert.equal((await api("/rooms", "POST", { name: "X", cost: -5 })).status, 400);
});

// ---------- Групи: валідація ----------

test("groups: неіснуючий ID дає 404, некоректний дає 400", async () => {
  assert.equal((await api("/groups/999999")).status, 404);
  assert.equal((await api("/groups/abc")).status, 400);
});

test("groups: вік поза 2-5 років дає 400", async () => {
  assert.equal((await api("/groups", "POST", { name: "Г", age: 6 })).status, 400);
  assert.equal((await api("/groups", "POST", { name: "Г", age: 1 })).status, 400);
});

test("groups: неіснуюча кімната дає 404", async () => {
  const res = await api("/groups", "POST", { name: `Г ${uid()}`, age: 3, roomId: 999999 });
  assert.equal(res.status, 404);
});

// ---------- Закріплення кімнат ----------

test("одна кімната закріплюється лише за однією групою, зайняту не можна видалити", async () => {
  const room = await (await api("/rooms", "POST", { name: `К ${uid()}` })).json();

  let res = await api("/groups", "POST", { name: `Г1 ${uid()}`, age: 3, roomId: room.id });
  assert.equal(res.status, 201);
  const group1 = await res.json();

  res = await api("/groups", "POST", { name: `Г2 ${uid()}`, age: 3, roomId: room.id });
  assert.equal(res.status, 409, "Друга група з тією ж кімнатою має дати 409");

  res = await api(`/rooms/${room.id}`, "DELETE");
  assert.equal(res.status, 409, "Зайняту кімнату не можна видалити");

  // Прибирання: порожня група видаляється, потім кімната
  assert.equal((await api(`/groups/${group1.id}`, "DELETE")).status, 200);
  assert.equal((await api(`/rooms/${room.id}`, "DELETE")).status, 200);
});

// ---------- Обмеження груп (на даних seed) ----------

async function seedGroupWithChildren() {
  const groups = await (await api("/groups")).json();
  const list = Array.isArray(groups) ? groups : groups.items ?? [];
  const group = list.find((g) => g.childrenCount > 0);
  assert.ok(group, "У seed немає групи з дітьми: виконайте seed");
  return group;
}

test("groups: limit не можна зменшити нижче кількості дітей", async () => {
  const group = await seedGroupWithChildren();
  const res = await api(`/groups/${group.id}`, "PATCH", { limit: group.childrenCount - 1 });
  assert.equal(res.status, 409);
});

test("groups: не можна змінити вік групи, де є діти іншого віку", async () => {
  const group = await seedGroupWithChildren();
  const newAge = group.age === 5 ? 4 : group.age + 1;
  const res = await api(`/groups/${group.id}`, "PATCH", { age: newAge });
  assert.equal(res.status, 409);
});

test("groups: групу з дітьми не можна видалити", async () => {
  const group = await seedGroupWithChildren();
  const res = await api(`/groups/${group.id}`, "DELETE");
  assert.equal(res.status, 409);
});