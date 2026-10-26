import test from "node:test";
import assert from "node:assert/strict";

import { generateSchedule } from "../src/modules/schedules/schedules.generator.js";
import { SCHEDULE } from "../src/config/constants.js";
import { toMinutes, intervalsOverlap } from "../src/lib/time.js";

test("generates lessons without teacher, group, or room overlaps", () => {
  const groups = [
    { id: 1, roomId: 101 },
    { id: 2, roomId: 102 },
  ];

  const subjects = [{ id: 1 }, { id: 2 }];

  const teachers = [
    { id: 1, subjectIds: [1, 2] },
    { id: 2, subjectIds: [1] },
  ];

  const { lessons, unscheduled } = generateSchedule({
    groups,
    subjects,
    teachers,
  });

  assert.equal(unscheduled.length, 0);
  assert.equal(lessons.length, groups.length * subjects.length);

  for (let i = 0; i < lessons.length; i += 1) {
    for (let j = i + 1; j < lessons.length; j += 1) {
      const first = lessons[i];
      const second = lessons[j];

      if (first.day !== second.day) {
        continue;
      }

      const firstStart = toMinutes(first.start);
      const secondStart = toMinutes(second.start);

      const firstEnd = firstStart + first.duration;
      const secondEnd = secondStart + second.duration;

      const overlaps = firstStart < secondEnd && secondStart < firstEnd;

      if (overlaps) {
        assert.notEqual(first.staffId, second.staffId);
        assert.notEqual(first.groupId, second.groupId);

        const firstRoom = groups.find(
          (group) => group.id === first.groupId,
        )?.roomId;
        const secondRoom = groups.find(
          (group) => group.id === second.groupId,
        )?.roomId;

        if (firstRoom != null && secondRoom != null) {
          assert.notEqual(firstRoom, secondRoom);
        }
      }
    }
  }
});

test("returns unscheduled entry when no teacher can teach a subject", () => {
  const result = generateSchedule({
    groups: [{ id: 1, roomId: 101 }],
    subjects: [{ id: 1 }],
    teachers: [],
  });

  assert.equal(result.lessons.length, 0);
  assert.equal(result.unscheduled.length, 1);
  assert.equal(result.unscheduled[0].groupId, 1);
  assert.equal(result.unscheduled[0].subjectId, 1);
});

test("does not schedule more than one weekly lesson per subject and group by default", () => {
  const result = generateSchedule({
    groups: [{ id: 1, roomId: 101 }],
    subjects: [{ id: 1 }, { id: 2 }],
    teachers: [{ id: 1, subjectIds: [1, 2] }],
  });

  assert.equal(result.lessons.length, 2);

  const subjectIds = result.lessons.map((lesson) => lesson.subjectId);

  assert.equal(subjectIds.filter((id) => id === 1).length, 1);
  assert.equal(subjectIds.filter((id) => id === 2).length, 1);
});

test("does not schedule two groups in the same room at the same time", () => {
  const result = generateSchedule({
    groups: [
      { id: 1, roomId: 10 },
      { id: 2, roomId: 10 },
    ],
    subjects: [{ id: 1 }],
    teachers: [{ id: 1, subjectIds: [1] }],
  });

  assert.equal(result.lessons.length, 2);

  for (let i = 0; i < result.lessons.length; i += 1) {
    for (let j = i + 1; j < result.lessons.length; j += 1) {
      const first = result.lessons[i];
      const second = result.lessons[j];

      if (first.day === second.day && first.start === second.start) {
        assert.notEqual(first.groupId, second.groupId);
      }
    }
  }
});

test("returns unscheduled lessons when there are not enough slots", () => {
  const result = generateSchedule({
    groups: [{ id: 1, roomId: 10 }],
    subjects: [{ id: 1 }, { id: 2 }, { id: 3 }],
    teachers: [{ id: 1, subjectIds: [1, 2, 3] }],
    // Вікно 30 хвилин без перерв: рівно один слот на день
    config: {
      DAYS: ["mon"],
      DAY_START: "09:00",
      STAY_HOURS: 0.5,
      FIXED_BREAKS: [],
      LESSON_MINUTES: 30,
      LESSONS_PER_SUBJECT_PER_WEEK: 1,
      MAX_SUBJECT_LESSONS_PER_DAY: 2,
    },
  });

  assert.equal(result.lessons.length, 1);
  assert.equal(result.unscheduled.length, 2);
});

test("жоден урок не перетинає харчування і сон", () => {
  const { lessons } = generateSchedule({
    groups: [
      { id: 1, roomId: 101 },
      { id: 2, roomId: 102 },
    ],
    subjects: [{ id: 1 }, { id: 2 }],
    teachers: [
      { id: 1, subjectIds: [1, 2] },
      { id: 2, subjectIds: [1, 2] },
    ],
  });

  assert.ok(lessons.length > 0);

  for (const lesson of lessons) {
    const start = toMinutes(lesson.start);
    const end = start + lesson.duration;

    for (const b of SCHEDULE.FIXED_BREAKS) {
      const bStart = toMinutes(b.start);
      assert.equal(
        intervalsOverlap(start, end, bStart, bStart + b.minutes),
        false,
        `урок ${lesson.start} перетинає ${b.name}`,
      );
    }
  }
});

test("усі уроки всередині вікна перебування", () => {
  const { lessons } = generateSchedule({
    groups: [{ id: 1, roomId: 101 }],
    subjects: [{ id: 1 }, { id: 2 }],
    teachers: [{ id: 1, subjectIds: [1, 2] }],
  });

  const dayStart = toMinutes(SCHEDULE.DAY_START);
  const dayEnd = dayStart + SCHEDULE.STAY_HOURS * 60;

  for (const lesson of lessons) {
    const start = toMinutes(lesson.start);
    assert.ok(start >= dayStart, `урок ${lesson.start} раніше початку дня`);
    assert.ok(
      start + lesson.duration <= dayEnd,
      `урок ${lesson.start} виходить за межі дня`,
    );
  }
});
