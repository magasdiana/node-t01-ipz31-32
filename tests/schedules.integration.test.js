// Фінальна інтеграційна перевірка модуля розкладу (тиждень 7, Назар).
// Працює без БД: сервіс збирається з підмінними залежностями (stateful-репозиторій),
// а генератор і правила накладок використовуються справжні.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generateSchedule,
  buildDaySlots,
  UNSCHEDULED_CODES,
} from "../src/modules/schedules/schedules.generator.js";
import { createSchedulesService } from "../src/modules/schedules/schedules.service.js";
import { findConflicts } from "../src/modules/lessons/lessons.rules.js";
import { buildStaffSchedule } from "../src/modules/staff/staff.service.js";
import { SCHEDULE } from "../src/config/constants.js";
import { toMinutes, intervalsOverlap } from "../src/lib/time.js";

// ---------- Дані ----------

const SUBJECTS = [1, 2, 3, 4, 5].map((id) => ({ id, name: `Гурток ${id}` }));

// 3 викладачі на кожен гурток (FR-15), як у seed
const TEACHERS = SUBJECTS.flatMap((s, i) =>
  [0, 1, 2].map((k) => ({
    id: 100 + i * 3 + k,
    position: "teacher",
    subjectIds: [s.id],
  })),
);

const makeGroups = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, roomId: 10 + i }));

const dayNumber = (d) => (typeof d === "number" ? d : SCHEDULE.DAYS.indexOf(d) + 1);

// Усі перевірки інваріантів розкладу в одному місці
function assertScheduleValid(lessons, groups, subjects = SUBJECTS) {
  const roomOf = new Map(groups.map((g) => [g.id, g.roomId]));
  const dayStart = toMinutes(SCHEDULE.DAY_START);
  const dayEnd = dayStart + SCHEDULE.STAY_HOURS * 60;
  const breaks = SCHEDULE.FIXED_BREAKS.map((b) => ({
    start: toMinutes(b.start),
    end: toMinutes(b.start) + b.minutes,
  }));

  for (const l of lessons) {
    const start = toMinutes(l.start);
    assert.equal(l.duration, SCHEDULE.LESSON_MINUTES, "тривалість заняття 30 хв (A4)");
    assert.ok(start >= dayStart && start + l.duration <= dayEnd, "заняття у вікні 8 годин");
    for (const b of breaks) {
      assert.equal(
        intervalsOverlap(start, start + l.duration, b.start, b.end),
        false,
        `заняття ${l.start} накладається на перерву`,
      );
    }
  }

  // Накладки: викладач, група, кімната (FR-19)
  for (let i = 0; i < lessons.length; i += 1) {
    for (let j = i + 1; j < lessons.length; j += 1) {
      const a = lessons[i];
      const b = lessons[j];
      if (dayNumber(a.day) !== dayNumber(b.day)) continue;
      const as = toMinutes(a.start);
      const bs = toMinutes(b.start);
      if (!intervalsOverlap(as, as + a.duration, bs, bs + b.duration)) continue;

      assert.notEqual(a.staffId, b.staffId, "викладач у двох місцях одночасно");
      assert.notEqual(a.groupId, b.groupId, "група на двох заняттях одночасно");
      assert.notEqual(roomOf.get(a.groupId), roomOf.get(b.groupId), "кімната зайнята двічі");
    }
  }

  // Не більше 2 занять на день для групи; кожен гурток рівно раз на тиждень (FR-20)
  for (const g of groups) {
    const own = lessons.filter((l) => l.groupId === g.id);
    const perDay = new Map();
    for (const l of own) perDay.set(dayNumber(l.day), (perDay.get(dayNumber(l.day)) ?? 0) + 1);
    for (const count of perDay.values()) {
      assert.ok(count <= SCHEDULE.MAX_SUBJECT_LESSONS_PER_DAY, `група ${g.id}: ${count} занять за день`);
    }
    for (const s of subjects) {
      assert.equal(
        own.filter((l) => l.subjectId === s.id).length,
        1,
        `група ${g.id} має мати гурток ${s.id} рівно один раз`,
      );
    }
  }
}

// Stateful-репозиторій: імітує таблицю lessons, щоб перевіряти збереження й перегенерацію
function createFakeLessonsRepo() {
  const state = { rows: [], nextId: 1, replaceCalls: 0 };
  const repo = {
    findByGroupId: async (groupId) => state.rows.filter((r) => r.groupId === groupId),
    replaceForGroups: async (groupIds, rows) => {
      state.replaceCalls += 1;
      state.rows = state.rows.filter((r) => !groupIds.includes(r.groupId));
      const created = rows.map((r) => ({ id: state.nextId++, ...r }));
      state.rows.push(...created);
      return created;
    },
  };
  return { repo, state };
}

function createService({ groups, staff = TEACHERS, subjects = SUBJECTS, repo, children = [] }) {
  return createSchedulesService({
    groupsService: { list: async () => groups },
    subjectsService: { list: async () => subjects },
    staffService: { list: async () => staff },
    childrenService: { list: async () => children },
    lessonsRepository: repo,
  });
}

const flatRows = (rows, groups) =>
  rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    subjectId: r.subjectId,
    staffId: r.staffId,
    ...r.data,
    roomId: groups.find((g) => g.id === r.groupId)?.roomId ?? null,
  }));

// ---------- Генератор: бізнес-правила ----------

describe("Генератор розкладу: бізнес-правила FR-17–FR-20", () => {
  it("сталі перерв: 3 прийоми їжі по 30 хв не підряд і 1 година сну в межах 8 годин", () => {
    const meals = SCHEDULE.FIXED_BREAKS.filter((b) => b.name.startsWith("meal"));
    const nap = SCHEDULE.FIXED_BREAKS.find((b) => b.name === "nap");

    assert.equal(meals.length, SCHEDULE.MEALS_PER_DAY);
    assert.ok(meals.every((m) => m.minutes === SCHEDULE.MEAL_MINUTES));
    assert.equal(nap.minutes, SCHEDULE.NAP_HOURS * 60);
    assert.equal(SCHEDULE.STAY_HOURS, 8);
    assert.equal(SCHEDULE.LESSON_MINUTES, 30);

    // Не підряд: між будь-якими двома прийомами їжі є проміжок
    const mealIntervals = meals
      .map((m) => ({ start: toMinutes(m.start), end: toMinutes(m.start) + m.minutes }))
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < mealIntervals.length; i += 1) {
      assert.ok(mealIntervals[i].start > mealIntervals[i - 1].end, "прийоми їжі йдуть підряд");
    }

    // Усі перерви лежать у межах вікна перебування
    const dayStart = toMinutes(SCHEDULE.DAY_START);
    const dayEnd = dayStart + SCHEDULE.STAY_HOURS * 60;
    for (const b of SCHEDULE.FIXED_BREAKS) {
      const s = toMinutes(b.start);
      assert.ok(s >= dayStart && s + b.minutes <= dayEnd, `перерва ${b.name} поза вікном`);
    }
  });

  it("слоти дня не перетинаються з перервами та не виходять за 8 годин", () => {
    const slots = buildDaySlots(SCHEDULE);
    assert.ok(slots.length > 0);
    for (const start of slots) {
      for (const b of SCHEDULE.FIXED_BREAKS) {
        const bs = toMinutes(b.start);
        assert.equal(intervalsOverlap(start, start + 30, bs, bs + b.minutes), false);
      }
      assert.ok(start + 30 <= toMinutes(SCHEDULE.DAY_START) + SCHEDULE.STAY_HOURS * 60);
    }
  });

  for (const n of [1, 4, 10, 20]) {
    it(`${n} груп(и) × 5 гуртків: повний розклад без накладок`, () => {
      const groups = makeGroups(n);
      const { lessons, unscheduled } = generateSchedule({
        groups,
        subjects: SUBJECTS,
        teachers: TEACHERS,
      });
      assert.deepEqual(unscheduled, []);
      assert.equal(lessons.length, n * SUBJECTS.length);
      assertScheduleValid(lessons, groups);
    });
  }

  it("викладач ведеться лише за гуртками, які він веде", () => {
    const { lessons } = generateSchedule({
      groups: makeGroups(4),
      subjects: SUBJECTS,
      teachers: TEACHERS,
    });
    const teacherSubjects = new Map(TEACHERS.map((t) => [t.id, t.subjectIds]));
    for (const l of lessons) {
      assert.ok(teacherSubjects.get(l.staffId).includes(l.subjectId));
    }
  });

  it("заняття групи розподілені по тижню: 5 гуртків у 5 різних днях", () => {
    const { lessons } = generateSchedule({
      groups: makeGroups(1),
      subjects: SUBJECTS,
      teachers: TEACHERS,
    });
    assert.equal(new Set(lessons.map((l) => l.day)).size, 5);
  });

  it("результат детермінований: однакові вхідні дані дають однаковий розклад", () => {
    const input = { groups: makeGroups(6), subjects: SUBJECTS, teachers: TEACHERS };
    assert.deepEqual(generateSchedule(input), generateSchedule(input));
  });

  it("generateSchedule не змінює вхідні дані", () => {
    const groups = makeGroups(2);
    const teachers = structuredClone(TEACHERS);
    const snapshot = structuredClone({ groups, teachers });
    generateSchedule({ groups, subjects: SUBJECTS, teachers });
    assert.deepEqual({ groups, teachers }, snapshot);
  });
});

describe("Генератор розкладу: нестача ресурсів і причини", () => {
  it("немає викладача для гуртка: NO_TEACHER для кожної групи, решта розставлена", () => {
    const groups = makeGroups(3);
    const teachers = TEACHERS.filter((t) => t.subjectIds[0] !== 5);
    const { lessons, unscheduled } = generateSchedule({ groups, subjects: SUBJECTS, teachers });

    assert.equal(lessons.length, 3 * 4);
    assert.equal(unscheduled.length, 3);
    for (const u of unscheduled) {
      assert.equal(u.subjectId, 5);
      assert.equal(u.code, UNSCHEDULED_CODES.NO_TEACHER);
      assert.ok(u.reason.length > 0);
    }
    assertScheduleValid(lessons, groups, SUBJECTS.slice(0, 4));
  });

  it("немає жодного викладача: усе незаплановано, заняття не вигадуються", () => {
    const { lessons, unscheduled } = generateSchedule({
      groups: makeGroups(2),
      subjects: SUBJECTS,
      teachers: [],
    });
    assert.equal(lessons.length, 0);
    assert.equal(unscheduled.length, 10);
  });

  it("мало часу: NO_SLOT і причина ліміту занять на день", () => {
    const { lessons, unscheduled } = generateSchedule({
      groups: makeGroups(1),
      subjects: SUBJECTS,
      teachers: TEACHERS,
      config: { DAYS: ["mon"], FIXED_BREAKS: [] }, // 1 день, ліміт 2 заняття
    });
    assert.equal(lessons.length, 2);
    assert.equal(unscheduled.length, 3);
    for (const u of unscheduled) {
      assert.equal(u.code, UNSCHEDULED_CODES.NO_SLOT);
      assert.ok(u.blockedBy.includes("daily_limit"));
    }
  });

  it("один викладач на гурток і мало слотів: блокування за викладачем зазначене", () => {
    const { unscheduled } = generateSchedule({
      groups: makeGroups(3),
      subjects: [{ id: 1 }],
      teachers: [{ id: 1, subjectIds: [1] }],
      config: { DAYS: ["mon"], STAY_HOURS: 0.5, FIXED_BREAKS: [] }, // один слот на тиждень
    });
    assert.equal(unscheduled.length, 2);
    assert.ok(unscheduled.every((u) => u.blockedBy.includes("teacher")));
  });

  it("дві групи в одній кімнаті не можуть мати заняття одночасно; нестача часу дає room", () => {
    const groups = [
      { id: 1, roomId: 7 },
      { id: 2, roomId: 7 },
    ];
    const teachers = [
      { id: 1, subjectIds: [1] },
      { id: 2, subjectIds: [1] },
    ];
    const { lessons, unscheduled } = generateSchedule({
      groups,
      subjects: [{ id: 1 }],
      teachers,
      config: { DAYS: ["mon"], STAY_HOURS: 0.5, FIXED_BREAKS: [] }, // лише один слот
    });
    assert.equal(lessons.length, 1);
    assert.equal(unscheduled.length, 1);
    assert.ok(unscheduled[0].blockedBy.includes("room"));
  });

  it("групи без кімнати (roomId = null) не блокують одна одну за кімнатою", () => {
    const groups = [
      { id: 1, roomId: null },
      { id: 2, roomId: null },
    ];
    const { unscheduled, lessons } = generateSchedule({
      groups,
      subjects: SUBJECTS,
      teachers: TEACHERS,
    });
    assert.deepEqual(unscheduled, []);
    assert.equal(lessons.length, 10);
  });

  it("busyLessons: генератор планує навколо вже існуючих занять викладача", () => {
    const busy = [
      // єдиний викладач гуртка 1 зайнятий у понеділок о 09:00 (день числом, як у БД)
      { groupId: 99, staffId: 1, roomId: 500, day: 1, start: "09:00", duration: 30 },
    ];
    const { lessons } = generateSchedule({
      groups: [{ id: 1, roomId: 10 }],
      subjects: [{ id: 1 }],
      teachers: [{ id: 1, subjectIds: [1] }],
      busyLessons: busy,
      config: { DAYS: ["mon"], FIXED_BREAKS: [] },
    });
    assert.equal(lessons.length, 1);
    assert.notEqual(lessons[0].start, "09:00");
  });
});

// ---------- Сервіс: POST /schedules ----------

describe("POST /schedules (сервіс): збереження, перегенерація, дублікати", () => {
  it("повторна повна генерація замінює заняття, дублікатів немає", async () => {
    const groups = makeGroups(4);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });

    const first = await service.generateSchedules({ save: true });
    assert.equal(first.saved, true);
    assert.equal(state.rows.length, 20);

    const second = await service.generateSchedules({ save: true });
    assert.equal(second.saved, true);
    assert.equal(state.rows.length, 20, "повторна генерація не має дублювати заняття");

    const keys = state.rows.map((r) => `${r.groupId}:${r.subjectId}`);
    assert.equal(new Set(keys).size, keys.length);
    assertScheduleValid(flatRows(state.rows, groups), groups);
  });

  it("чернетка (save не передано) нічого не пише в БД", async () => {
    const groups = makeGroups(3);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });

    const result = await service.generateSchedules({});
    assert.equal(result.saved, false);
    assert.equal(result.lessons.length, 15);
    assert.equal(state.replaceCalls, 0);
    assert.equal(state.rows.length, 0);
  });

  it("часткова перегенерація однієї групи не дає накладок із групами, що лишаються", async () => {
    const groups = makeGroups(4);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });

    await service.generateSchedules({ save: true });
    const keptBefore = JSON.stringify(state.rows.filter((r) => r.groupId !== 2).map(({ id, ...r }) => r));

    const result = await service.generateSchedules({ groupIds: [2], save: true });
    assert.equal(result.saved, true);
    assert.equal(result.lessons.length, 5);

    // групи 1, 3, 4 не змінилися
    const keptAfter = JSON.stringify(state.rows.filter((r) => r.groupId !== 2).map(({ id, ...r }) => r));
    assert.equal(keptAfter, keptBefore);

    assert.equal(state.rows.length, 20);
    assertScheduleValid(flatRows(state.rows, groups), groups);
  });

  it("перегенерація кількох груп одразу зберігає цілісний розклад", async () => {
    const groups = makeGroups(5);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });

    await service.generateSchedules({ save: true });
    await service.generateSchedules({ groupIds: [1, 4], save: true });

    assert.equal(state.rows.length, 25);
    assertScheduleValid(flatRows(state.rows, groups), groups);
  });

  it("не зберігає нічого, якщо хоч одне заняття не вдалося розставити (409)", async () => {
    const groups = makeGroups(2);
    const { repo, state } = createFakeLessonsRepo();
    const staff = TEACHERS.filter((t) => t.subjectIds[0] !== 3);
    const service = createService({ groups, staff, repo });

    await assert.rejects(service.generateSchedules({ save: true }), (e) => e.status === 409);
    assert.equal(state.replaceCalls, 0);

    // чернетка при цьому доступна й пояснює причину
    const draft = await service.generateSchedules({});
    assert.equal(draft.saved, false);
    assert.equal(draft.unscheduled.length, 2);
    assert.ok(draft.unscheduled.every((u) => u.code === UNSCHEDULED_CODES.NO_TEACHER));
  });

  it("день у відповіді — число 1–5, початок у форматі HH:MM", async () => {
    const groups = makeGroups(2);
    const { repo } = createFakeLessonsRepo();
    const service = createService({ groups, repo });
    const { lessons } = await service.generateSchedules({});
    for (const l of lessons) {
      assert.ok(Number.isInteger(l.day) && l.day >= 1 && l.day <= 5);
      assert.match(l.start, /^\d{2}:\d{2}$/);
    }
  });

  it("зберігає лише викладачів-teacher (educator/assistant у розкладі не беруть участі)", async () => {
    const groups = makeGroups(1);
    const { repo, state } = createFakeLessonsRepo();
    const staff = [
      ...TEACHERS,
      { id: 900, position: "educator", subjectIds: SUBJECTS.map((s) => s.id) },
      { id: 901, position: "assistant", subjectIds: SUBJECTS.map((s) => s.id) },
    ];
    const service = createService({ groups, staff, repo });
    await service.generateSchedules({ save: true });
    assert.ok(state.rows.every((r) => r.staffId !== 900 && r.staffId !== 901));
  });
});

// ---------- Сервіс: GET /schedules/forecast ----------

describe("GET /schedules/forecast (сервіс)", () => {
  // Будь-який виклик репозиторію занять під час прогнозу — помилка
  const forbiddenRepo = new Proxy(
    {},
    {
      get: (_t, name) => () => {
        throw new Error(`Прогноз не має звертатися до репозиторію занять: ${String(name)}`);
      },
    },
  );

  const children = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, groupId: 1 })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: i + 50, groupId: 2 })),
  ];

  it("не пише і не читає таблицю занять (отже, не створює записів в історії)", async () => {
    const service = createService({ groups: makeGroups(2), repo: forbiddenRepo, children });
    const result = await service.forecastSchedule({ groups: 4, children: "15,12,18,14" });
    assert.equal(result.lessons.length, 20);
  });

  it("поточні дані БД: групи та діти беруться з БД", async () => {
    const service = createService({ groups: makeGroups(2), repo: forbiddenRepo, children });
    const r = await service.forecastSchedule({});

    assert.equal(r.roomsNeeded, 2);
    assert.deepEqual(r.scenario.groups.map((g) => g.childrenCount), [12, 8]);
    assert.equal(r.scenario.totalChildren, 20);
    assert.ok(r.scenario.groups.every((g) => g.isVirtual === false));
    assert.deepEqual(r.conflicts, []);
    assert.deepEqual(r.unscheduled, []);
    assertScheduleValid(r.lessons, r.scenario.groups.map((g) => ({ id: g.groupId, roomId: g.roomId })));
  });

  it("параметри прогнозу: більше груп, ніж у БД, — додаються віртуальні групи з окремими кімнатами", async () => {
    const service = createService({ groups: makeGroups(2), repo: forbiddenRepo, children });
    const r = await service.forecastSchedule({ groups: 6, children: "20,20,20,20,20,20" });

    assert.equal(r.roomsNeeded, 6);
    assert.equal(r.lessons.length, 30);
    assert.equal(r.scenario.groups.length, 6);
    assert.equal(r.scenario.groups.filter((g) => g.isVirtual).length, 4);
    assert.equal(r.scenario.totalChildren, 120);
    assert.deepEqual(r.conflicts, []);

    // віртуальні групи не мають реальних id і кімнат
    for (const g of r.scenario.groups.filter((x) => x.isVirtual)) {
      assert.ok(g.groupId < 0);
      assert.equal(g.roomId, null);
    }
    // кожна з 6 груп має всі 5 гуртків
    for (const g of r.scenario.groups) {
      const own = r.lessons.filter((l) => l.groupId === g.groupId);
      assert.equal(new Set(own.map((l) => l.subjectId)).size, 5);
    }
  });

  it("загальна кількість дітей розподіляється між групами рівномірно", async () => {
    const service = createService({ groups: makeGroups(2), repo: forbiddenRepo, children });
    const r = await service.forecastSchedule({ groups: 5, children: "47" });
    assert.deepEqual(r.scenario.groups.map((g) => g.childrenCount), [10, 10, 9, 9, 9]);
    assert.equal(r.scenario.totalChildren, 47);
  });

  it("менше груп, ніж у БД: беруться перші за id", async () => {
    const service = createService({ groups: makeGroups(4), repo: forbiddenRepo });
    const r = await service.forecastSchedule({ groups: 2, children: "10" });
    assert.deepEqual(r.scenario.groups.map((g) => g.groupId), [1, 2]);
  });

  it("порожня БД: без groups — RangeError, з groups — прогноз за віртуальними групами", async () => {
    const service = createService({ groups: [], repo: forbiddenRepo });
    await assert.rejects(() => service.forecastSchedule({}), RangeError);

    const r = await service.forecastSchedule({ groups: 3, children: "30" });
    assert.equal(r.roomsNeeded, 3);
    assert.equal(r.lessons.length, 15);
    assert.ok(r.scenario.groups.every((g) => g.isVirtual));
  });

  it("некоректні сценарії відхиляються RangeError", async () => {
    const service = createService({ groups: makeGroups(2), repo: forbiddenRepo });
    const bad = [
      { groups: 0 },
      { groups: 51 },
      { groups: 3, children: "10,10" }, // довжина списку ≠ groups
      { groups: 2, children: "21,5" }, // > 20 дітей у групі
      { groups: 2, children: "41" }, // 41 дитина на 2 групи → 21 в одній
      { groups: 2, children: "-5" },
    ];
    for (const query of bad) {
      await assert.rejects(() => service.forecastSchedule(query), RangeError, JSON.stringify(query));
    }
  });

  it("недостатньо викладачів: незаплановані заняття з причиною і збільшений teachersNeeded", async () => {
    const staff = TEACHERS.filter((t) => t.subjectIds[0] !== 4);
    const service = createService({ groups: makeGroups(3), staff, repo: forbiddenRepo });
    const r = await service.forecastSchedule({});

    assert.equal(r.lessons.length, 12);
    assert.equal(r.unscheduled.length, 3);
    assert.ok(r.unscheduled.every((u) => u.subjectId === 4 && u.code === "NO_TEACHER"));
    assert.deepEqual(r.conflicts, []);

    const used = new Set(r.lessons.map((l) => l.staffId)).size;
    assert.equal(r.teachersNeeded, used + 1);
  });

  it("групи без кімнати у БД: прогноз усе одно без накладок за кімнатою", async () => {
    const groups = [
      { id: 1, roomId: null },
      { id: 2, roomId: null },
    ];
    const service = createService({ groups, repo: forbiddenRepo });
    const r = await service.forecastSchedule({});
    assert.deepEqual(r.conflicts, []);
    assert.equal(r.lessons.length, 10);
    assert.ok(r.scenario.groups.every((g) => g.roomId === null));
  });

  it("великий сценарій (50 груп): без конфліктів і без порушень правил", async () => {
    const service = createService({ groups: [], repo: forbiddenRepo });
    const r = await service.forecastSchedule({ groups: 50, children: "500" });

    assert.equal(r.roomsNeeded, 50);
    assert.deepEqual(r.conflicts, []);
    assert.equal(r.unscheduled.length, 0);
    assertScheduleValid(
      r.lessons,
      r.scenario.groups.map((g) => ({ id: g.groupId, roomId: -(Math.abs(g.groupId)) })),
    );
  });

  it("прогноз не змінює дані, повернені сервісами (групи, діти)", async () => {
    const groups = makeGroups(2);
    const snapshot = structuredClone({ groups, children });
    const service = createService({ groups, repo: forbiddenRepo, children });
    await service.forecastSchedule({ groups: 4, children: "10,10,10,10" });
    assert.deepEqual({ groups, children }, snapshot);
  });
});

// ---------- Узгодженість зі GET /staff/:id/schedule ----------

describe("GET /staff/:id/schedule: розклад викладача збігається з призначеннями", () => {
  it("кожен викладач бачить рівно свої заняття, відсортовані за днем і часом", async () => {
    const groups = makeGroups(4);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });
    await service.generateSchedules({ save: true });

    for (const teacher of TEACHERS) {
      const rows = state.rows
        .filter((r) => r.staffId === teacher.id)
        .map((r) => ({ ...r, subject: { data: { name: `Гурток ${r.subjectId}` } } }));

      const schedule = buildStaffSchedule({ id: teacher.id, data: { name: "Т" } }, rows);

      assert.equal(schedule.staffId, teacher.id);
      assert.equal(schedule.lessons.length, rows.length);
      assert.ok(schedule.lessons.every((l) => rows.some((r) => r.id === l.id)));

      for (let i = 1; i < schedule.lessons.length; i += 1) {
        const prev = schedule.lessons[i - 1];
        const cur = schedule.lessons[i];
        assert.ok(
          prev.day < cur.day || (prev.day === cur.day && prev.start < cur.start),
          "заняття викладача мають бути відсортовані й без накладок",
        );
      }
    }
  });

  it("жодне заняття не лишається без викладача, і сума по викладачах дорівнює розкладу", async () => {
    const groups = makeGroups(3);
    const { repo, state } = createFakeLessonsRepo();
    const service = createService({ groups, repo });
    await service.generateSchedules({ save: true });

    const total = TEACHERS.reduce(
      (sum, t) => sum + state.rows.filter((r) => r.staffId === t.id).length,
      0,
    );
    assert.equal(total, state.rows.length);
  });
});

// ---------- Правила накладок (FR-19) ----------

describe("findConflicts: контрольні випадки", () => {
  const base = { groupId: 1, staffId: 1, roomId: 1, day: 1, start: "09:00", duration: 30 };

  it("суміжні заняття (09:00–09:30 і 09:30–10:00) не накладаються", () => {
    assert.deepEqual(findConflicts({ ...base, groupId: 2, staffId: 2, roomId: 2, start: "09:30" }, [base]), []);
  });

  it("однаковий час: викладач, група та кімната дають окремі конфлікти", () => {
    const types = findConflicts({ ...base, id: 2 }, [base]).map((c) => c.type).sort();
    assert.deepEqual(types, ["group", "room", "teacher"]);
  });

  it("різні дні не конфліктують", () => {
    assert.deepEqual(findConflicts({ ...base, day: 2 }, [base]), []);
  });
});
