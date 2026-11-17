import test from "node:test";
import assert from "node:assert/strict";

import { forecastScheduleSchema } from "../src/modules/schedules/schedules.schema.js";
import { createSchedulesService } from "../src/modules/schedules/schedules.service.js";
import { SCHEDULE } from "../src/config/constants.js";
import { toMinutes, intervalsOverlap } from "../src/lib/time.js";

const mockSubjects = [
  { id: 1, name: "Малювання" },
  { id: 2, name: "Музика" },
  { id: 3, name: "Англійська" },
  { id: 4, name: "Танці" },
  { id: 5, name: "Логіка" },
];

const mockTeachers = [
  { id: 101, position: "teacher", subjectIds: [1, 2] },
  { id: 102, position: "teacher", subjectIds: [3, 4] },
  { id: 103, position: "teacher", subjectIds: [5] },
];

const mockGroups = [
  { id: 1, roomId: 11, data: { name: "Сонечко" } },
  { id: 2, roomId: 12, data: { name: "Квіточка" } },
];

const mockChildren = [
  ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, groupId: 1 })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: i + 20, groupId: 2 })),
];

function createTestService() {
  let dbWriteCalls = 0;

  const service = createSchedulesService({
    groupsService: { list: async () => mockGroups },
    subjectsService: { list: async () => mockSubjects },
    staffService: { list: async () => mockTeachers },
    childrenService: { list: async () => mockChildren },
    lessonsRepository: {
      replaceForGroups: async () => {
        dbWriteCalls += 1;
        return [];
      },
      create: async () => {
        dbWriteCalls += 1;
      },
    },
  });

  return { service, getDbWriteCalls: () => dbWriteCalls };
}

test("forecastScheduleSchema: валідні та невалідні query-параметри", () => {
  const validQueries = [
    {},
    { groups: "3" },
    { groups: "3", children: "40" },
    { groups: "3", children: "15,12,18" },
  ];

  for (const query of validQueries) {
    assert.equal(forecastScheduleSchema.safeParse({ query }).success, true);
  }

  const invalidQueries = [
    { groups: "0" },
    { groups: "51" },
    { groups: "-2" },
    { groups: "abc" },
    { children: "-5" },
    { children: "10,abc" },
    { children: "10," },
  ];

  for (const query of invalidQueries) {
    assert.equal(forecastScheduleSchema.safeParse({ query }).success, false);
  }
});

test("forecastSchedule: значення за замовчуванням та відсутність запису в БД", async () => {
  const { service, getDbWriteCalls } = createTestService();
  const result = await service.forecastSchedule({});

  assert.equal(getDbWriteCalls(), 0);
  assert.equal(result.roomsNeeded, 2);
  assert.equal(result.teachersNeeded, 3);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.unscheduled, []);
  assert.equal(result.lessons.length, 10); // 2 групи * 5 гуртків
});

test("forecastSchedule: масштабування до 4 груп з children=15,12,18,14", async () => {
  const { service, getDbWriteCalls } = createTestService();
  const result = await service.forecastSchedule({
    groups: 4,
    children: "15,12,18,14",
  });

  assert.equal(getDbWriteCalls(), 0);
  assert.equal(result.roomsNeeded, 4);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.lessons.length, 20); // 4 групи * 5 гуртків

  // Кожна з 4 груп має всі 5 гуртків
  const groupIds = [...new Set(result.lessons.map((l) => l.groupId))];
  assert.equal(groupIds.length, 4);

  for (const gid of groupIds) {
    const groupLessons = result.lessons.filter((l) => l.groupId === gid);
    const subjectIds = new Set(groupLessons.map((l) => l.subjectId));
    assert.equal(subjectIds.size, 5);

    // Ліміт: не більше 2 занять на день для групи
    const byDay = new Map();
    for (const lesson of groupLessons) {
      byDay.set(lesson.day, (byDay.get(lesson.day) ?? 0) + 1);
    }
    for (const count of byDay.values()) {
      assert.ok(count <= SCHEDULE.MAX_SUBJECT_LESSONS_PER_DAY);
    }
  }
});

test("forecastSchedule: заняття не перетинаються зі сном та харчуванням (FR-17, FR-18)", async () => {
  const { service } = createTestService();
  const result = await service.forecastSchedule({ groups: 3, children: "36" });

  const breaks = SCHEDULE.FIXED_BREAKS.map((b) => {
    const start = toMinutes(b.start);
    return { start, end: start + b.minutes };
  });

  for (const lesson of result.lessons) {
    const start = toMinutes(lesson.start);
    const end = start + lesson.duration;
    const overlapsBreak = breaks.some((b) =>
      intervalsOverlap(start, end, b.start, b.end),
    );
    assert.equal(overlapsBreak, false);
  }
});

test("forecastSchedule: невідповідність довжини списку children до groups або > 20 дітей кидає RangeError", async () => {
  const { service } = createTestService();

  await assert.rejects(
    () => service.forecastSchedule({ groups: 3, children: "15,12" }),
    RangeError,
  );

  await assert.rejects(
    () => service.forecastSchedule({ groups: 2, children: "21,10" }),
    RangeError,
  );
});