import { generateSchedule } from "./schedules.generator.js";
import { findConflicts } from "../lessons/lessons.rules.js";
import { toDto } from "../../lib/dto.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";

import * as groupsModule from "../groups/groups.service.js";
import * as subjectsModule from "../subjects/subjects.service.js";
import * as staffModule from "../staff/staff.service.js";
import * as lessonsModule from "../lessons/lessons.repository.js";

// У constants дні 'mon'...'fri', а в БД зберігаємо число 1-5.
const DAY_NUMBERS = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };

function toDayNumber(day) {
  const n = typeof day === "number" ? day : DAY_NUMBERS[day];
  if (!n) throw new Error(`Невідомий день розкладу: ${day}`);
  return n;
}

const sortLessons = (a, b) =>
  a.groupId - b.groupId || a.day - b.day || a.start.localeCompare(b.start);

// Рядок із БД { id, groupId, subjectId, staffId, data } -> плаский об'єкт
const flatten = (row) => ({
  id: row.id,
  groupId: row.groupId,
  subjectId: row.subjectId,
  staffId: row.staffId,
  ...row.data,
});

function pickGroups(allGroups, groupIds) {
  if (!groupIds) {
    if (allGroups.length === 0)
      throw new ConflictError("Немає груп для генерації розкладу");
    return allGroups;
  }
  const ids = [...new Set(groupIds)];
  const byId = new Map(allGroups.map((g) => [g.id, g]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new NotFoundError(`Групи не знайдено: ${missing.join(", ")}`, {
      missing,
    });
  }
  return ids.map((id) => byId.get(id));
}

export function createSchedulesService({
  groupsService,
  subjectsService,
  staffService,
  lessonsRepository,
  generate = generateSchedule,
  conflicts = findConflicts,
}) {
  // Генератор не бачить занять груп, які лишаються. Якщо генеруємо лише частину груп,
  // перевіряємо, що нові заняття не накладаються на збережені.
  async function assertNoClashWithKept(lessons, targetGroups, allGroups) {
    if (typeof lessonsRepository.findByGroupId !== "function") return;
    const targetIds = new Set(targetGroups.map((g) => g.id));
    const keptGroups = allGroups.filter((g) => !targetIds.has(g.id));
    if (keptGroups.length === 0) return;

    const roomOf = new Map(allGroups.map((g) => [g.id, g.roomId ?? null]));
    const groupsForRules = allGroups.map((g) => ({
      id: g.id,
      roomId: g.roomId ?? null,
    }));

    const keptRows = (
      await Promise.all(
        keptGroups.map((g) => lessonsRepository.findByGroupId(g.id)),
      )
    ).flat();
    const kept = keptRows.map((row) => ({
      ...flatten(row),
      roomId: roomOf.get(row.groupId) ?? null,
    }));

    const clashes = [];
    for (const lesson of lessons) {
      const found = conflicts(
        { ...lesson, roomId: roomOf.get(lesson.groupId) ?? null },
        kept,
        groupsForRules,
      );
      if (found.length > 0) clashes.push({ lesson, conflicts: found });
    }
    if (clashes.length > 0) {
      throw new ConflictError(
        "Нові заняття накладаються на розклад інших груп. Згенеруйте розклад для всіх груп.",
        { clashes },
      );
    }
  }

  async function generateSchedules({ groupIds } = {}) {
    const allGroups = await groupsService.list();
    const targetGroups = pickGroups(allGroups, groupIds);

    const subjects = await subjectsService.list();
    if (subjects.length === 0)
      throw new ConflictError("Немає гуртків для генерації розкладу");

    const staff = await staffService.list();
    const teachers = staff
      .filter((s) => s.position === "teacher")
      .map((s) => ({ id: s.id, subjectIds: s.subjectIds ?? [] }));

    const { lessons: generated, unscheduled } = generate({
      groups: targetGroups.map((g) => ({ id: g.id, roomId: g.roomId ?? null })),
      subjects: subjects.map((s) => ({ id: s.id })),
      teachers,
    });

    const lessons = generated.map((l) => ({ ...l, day: toDayNumber(l.day) }));
    await assertNoClashWithKept(lessons, targetGroups, allGroups);

    // Репозиторій Назара ще не готовий: віддаємо чернетку без запису
    if (typeof lessonsRepository.replaceForGroups !== "function") {
      return {
        saved: false,
        lessons: [...lessons].sort(sortLessons),
        unscheduled,
      };
    }

    // FK окремо, день і час у JSON
    const rows = lessons.map(
      ({ groupId, subjectId, staffId, day, start, duration }) => ({
        groupId,
        subjectId,
        staffId,
        data: { day, start, duration },
      }),
    );

    const created = await lessonsRepository.replaceForGroups(
      targetGroups.map((g) => g.id),
      rows,
    );

    return {
      saved: true,
      lessons: created
        .map((row) =>
          toDto(row, {
            groupId: row.groupId,
            subjectId: row.subjectId,
            staffId: row.staffId,
          }),
        )
        .sort(sortLessons),
      unscheduled,
    };
  }

  return { generateSchedules };
}

const schedulesService = createSchedulesService({
  groupsService: { list: () => groupsModule.groupsService.list() },
  subjectsService: { list: () => subjectsModule.subjectsService.getAll() },
  staffService: { list: () => staffModule.staffService.getAll() },
  lessonsRepository: lessonsModule.lessonsRepository ?? lessonsModule,
});

export const generateSchedules = (args) =>
  schedulesService.generateSchedules(args);
