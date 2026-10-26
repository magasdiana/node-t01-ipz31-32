import { test } from "node:test";
import assert from "node:assert/strict";
import { createSchedulesService } from "../src/modules/schedules/schedules.service.js";

const groups = [
  { id: 1, roomId: 1 },
  { id: 2, roomId: 2 },
];
const staff = [
  { id: 10, position: "teacher", subjectIds: [1, 2] },
  { id: 11, position: "teacher", subjectIds: [1, 2] },
  { id: 20, position: "educator" }, // не викладач, ігнорується
];

function setup({
  subjects = [{ id: 1 }, { id: 2 }],
  keptRows = [],
  conflicts,
  repo,
} = {}) {
  const saved = [];
  const lookedUp = [];
  const lessonsRepository = repo ?? {
    findByGroupId: async (id) => {
      lookedUp.push(id);
      return keptRows;
    },
    replaceForGroups: async (groupIds, rows) => {
      saved.push({ groupIds, rows });
      return rows.map((r, i) => ({ id: i + 1, ...r }));
    },
  };
  const service = createSchedulesService({
    groupsService: { list: async () => groups },
    subjectsService: { list: async () => subjects },
    staffService: { list: async () => staff },
    lessonsRepository,
    ...(conflicts && { conflicts }),
  });
  return { service, saved, lookedUp };
}

test("генерує розклад для всіх груп і зберігає його", async () => {
  const { service, saved } = setup();
  const result = await service.generateSchedules({});

  assert.equal(result.saved, true);
  assert.equal(result.lessons.length, 4); // 2 групи * 2 гуртки
  assert.deepEqual(result.unscheduled, []);
  assert.deepEqual(saved[0].groupIds, [1, 2]);

  const seen = new Set();
  for (const l of result.lessons) {
    assert.ok(Number.isInteger(l.day) && l.day >= 1 && l.day <= 5);
    assert.equal(l.duration, 30);
    for (const key of [
      `t:${l.staffId}:${l.day}:${l.start}`,
      `g:${l.groupId}:${l.day}:${l.start}`,
    ]) {
      assert.ok(!seen.has(key), `накладка ${key}`);
      seen.add(key);
    }
  }
});

test("у БД день і час лежать у data, FK окремо", async () => {
  const { service, saved } = setup();
  await service.generateSchedules({});
  const row = saved[0].rows[0];
  assert.deepEqual(Object.keys(row).sort(), [
    "data",
    "groupId",
    "staffId",
    "subjectId",
  ]);
  assert.deepEqual(Object.keys(row.data).sort(), ["day", "duration", "start"]);
});

test("groupIds обмежує генерацію вибраними групами", async () => {
  const { service, saved, lookedUp } = setup();
  await service.generateSchedules({ groupIds: [2] });
  assert.deepEqual(saved[0].groupIds, [2]);
  assert.deepEqual(lookedUp, [1]); // перевірили групу, яка лишається
});

test("неіснуюча група дає 404 і нічого не зберігається", async () => {
  const { service, saved } = setup();
  await assert.rejects(
    service.generateSchedules({ groupIds: [99] }),
    (e) => e.status === 404,
  );
  assert.equal(saved.length, 0);
});

test("нерозставлені заняття повертаються в unscheduled, решта зберігається", async () => {
  const { service, saved } = setup({ subjects: [{ id: 1 }, { id: 3 }] }); // для гуртка 3 немає викладача
  const result = await service.generateSchedules({});

  assert.equal(result.saved, true);
  assert.equal(result.lessons.length, 2); // гурток 1 у двох групах
  assert.equal(result.unscheduled.length, 2); // гурток 3 у двох групах
  assert.ok(result.unscheduled.every((u) => u.subjectId === 3 && u.reason));
  assert.equal(saved[0].rows.length, 2);
});

test("без replaceForGroups віддає чернетку без запису", async () => {
  const { service } = setup({ repo: {} });
  const result = await service.generateSchedules({});

  assert.equal(result.saved, false);
  assert.equal(result.lessons.length, 4);
  assert.ok(result.lessons.every((l) => l.id === undefined));
});

test("накладка на групу, що лишається, дає 409 і без збереження", async () => {
  const keptRows = [
    {
      id: 5,
      groupId: 2,
      subjectId: 1,
      staffId: 10,
      data: { day: 1, start: "09:00", duration: 30 },
    },
  ];
  const { service, saved } = setup({
    keptRows,
    conflicts: () => [{ reason: "викладач зайнятий" }],
  });
  await assert.rejects(
    service.generateSchedules({ groupIds: [1] }),
    (e) => e.status === 409,
  );
  assert.equal(saved.length, 0);
});

test("немає груп: 409 і нічого не зберігається", async () => {
  const saved = [];
  const service = createSchedulesService({
    groupsService: { list: async () => [] },
    subjectsService: { list: async () => [{ id: 1 }] },
    staffService: { list: async () => staff },
    lessonsRepository: {
      replaceForGroups: async (ids, rows) => {
        saved.push(rows);
        return [];
      },
    },
  });
  await assert.rejects(service.generateSchedules({}), (e) => e.status === 409);
  assert.equal(saved.length, 0);
});
