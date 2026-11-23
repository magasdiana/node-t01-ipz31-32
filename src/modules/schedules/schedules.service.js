import { generateSchedule } from "./schedules.generator.js";
import { findConflicts } from "../lessons/lessons.rules.js";
import { toDto } from "../../lib/dto.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import { LIMITS, REPORTS } from "../../config/constants.js";

import * as groupsModule from "../groups/groups.service.js";
import * as subjectsModule from "../subjects/subjects.service.js";
import * as staffModule from "../staff/staff.service.js";
import * as lessonsModule from "../lessons/lessons.repository.js";
import * as childrenModule from "../children/children.service.js";

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

function scenarioSizes(query, allGroups, allChildren) {
  const { groups, children } = query;
  const count = groups ?? allGroups.length;

  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    count > REPORTS.MAX_ROOMS_SEARCH
  ) {
    throw new RangeError(
      "groups має бути від 1 до 50; у порожній БД передайте groups явно",
    );
  }

  let sizes;

  if (children === undefined) {
    if (groups === undefined || count === allGroups.length) {
      sizes = allGroups.map(
        (g) => allChildren.filter((c) => c.groupId === g.id).length,
      );
    } else {
      const total = allChildren.length;
      sizes = Array.from(
        { length: count },
        (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
      );
    }
  } else if (String(children).includes(",")) {
    sizes = String(children).split(",").map(Number);

    if (sizes.length !== count) {
      throw new RangeError("Довжина списку children має дорівнювати groups");
    }
  } else {
    const total = Number(children);

    if (!Number.isSafeInteger(total) || total < 0) {
      throw new RangeError("Некоректна кількість дітей");
    }

    sizes = Array.from(
      { length: count },
      (_, i) => Math.floor(total / count) + (i < total % count ? 1 : 0),
    );
  }

  if (
    sizes.some(
      (n) =>
        !Number.isSafeInteger(n) ||
        n < 0 ||
        n > LIMITS.GROUP_MAX_CHILDREN,
    )
  ) {
    throw new RangeError(
      `Кількість дітей у кожній групі має бути 0–${LIMITS.GROUP_MAX_CHILDREN}`,
    );
  }

  return sizes;
}

export function createSchedulesService({
  groupsService,
  subjectsService,
  staffService,
  childrenService,
  lessonsRepository,
  generate = generateSchedule,
  conflicts = findConflicts,
}) {
  // Заняття груп, які лишаються без змін (їх не перегенеровуємо). Генератор планує
  // навколо них, а перед збереженням ми ще раз перевіряємо відсутність накладок.
  async function loadKeptLessons(targetGroups, allGroups) {
    if (typeof lessonsRepository.findByGroupId !== "function") return [];
    const targetIds = new Set(targetGroups.map((g) => g.id));
    const keptGroups = allGroups.filter((g) => !targetIds.has(g.id));
    if (keptGroups.length === 0) return [];

    const roomOf = new Map(allGroups.map((g) => [g.id, g.roomId ?? null]));
    const keptRows = (
      await Promise.all(
        keptGroups.map((g) => lessonsRepository.findByGroupId(g.id)),
      )
    ).flat();

    return keptRows.map((row) => ({
      ...flatten(row),
      roomId: roomOf.get(row.groupId) ?? null,
    }));
  }

  function assertNoClashWithKept(lessons, kept, allGroups) {
    if (kept.length === 0) return;

    const roomOf = new Map(allGroups.map((g) => [g.id, g.roomId ?? null]));
    const groupsForRules = allGroups.map((g) => ({
      id: g.id,
      roomId: g.roomId ?? null,
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

  async function generateSchedules({ groupIds, save = false } = {}) {
    const allGroups = await groupsService.list();
    const targetGroups = pickGroups(allGroups, groupIds);

    const subjects = await subjectsService.list();
    if (subjects.length === 0)
      throw new ConflictError("Немає гуртків для генерації розкладу");

    const staff = await staffService.list();
    const teachers = staff
      .filter((s) => s.position === "teacher")
      .map((s) => ({ id: s.id, subjectIds: s.subjectIds ?? [] }));

    // Заняття груп, що лишаються, передаємо генератору як зайняті слоти:
    // так часткова перегенерація (groupIds) не дає накладок за викладачем і кімнатою
    const kept = await loadKeptLessons(targetGroups, allGroups);

    const { lessons: generated, unscheduled } = generate({
      groups: targetGroups.map((g) => ({ id: g.id, roomId: g.roomId ?? null })),
      subjects: subjects.map((s) => ({ id: s.id })),
      teachers,
      busyLessons: kept,
    });

    const lessons = generated.map((l) => ({ ...l, day: toDayNumber(l.day) }));
    assertNoClashWithKept(lessons, kept, allGroups);

    // Якщо save не передано або він false — повертаємо лише чернетку
    if (!save) {
      return {
        saved: false,
        lessons: [...lessons].sort(sortLessons),
        unscheduled,
      };
    }

    // Якщо є незаплановані заняття — нічого не зберігаємо
    if (unscheduled.length > 0) {
      throw new ConflictError(
        "Не всі заняття вдалося запланувати. Розклад не збережено.",
        { unscheduled },
      );
    }

    // Для збереження потрібен метод репозиторію
    if (typeof lessonsRepository.replaceForGroups !== "function") {
      throw new Error("Репозиторій не підтримує збереження розкладу");
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

  async function forecastSchedule(query = {}) {
    const [allGroups, allChildren, subjects, staff] = await Promise.all([
      groupsService.list(),
      childrenService.list(),
      subjectsService.list(),
      staffService.list(),
    ]);

    const orderedGroups = [...allGroups].sort((a, b) => a.id - b.id);
    const sizes = scenarioSizes(query, orderedGroups, allChildren);

    // Формуємо масив груп у пам'яті: реальні + шаблонні віртуальні для додаткових груп
    const scenarioGroups = sizes.map((childrenCount, index) => {
      const existing = orderedGroups[index];
      if (existing) {
        return {
          id: existing.id,
          roomId: existing.roomId ?? -(index + 1),
          childrenCount,
          isVirtual: false,
        };
      }
      return {
        id: -(index + 1),
        roomId: -(index + 1),
        childrenCount,
        isVirtual: true,
      };
    });

    const teachers = staff
      .filter((s) => s.position === "teacher")
      .map((s) => ({ id: s.id, subjectIds: s.subjectIds ?? [] }));

    const { lessons: generated, unscheduled } =
      subjects.length === 0
        ? { lessons: [], unscheduled: [] }
        : generate({
            groups: scenarioGroups.map((g) => ({
              id: g.id,
              roomId: g.roomId,
            })),
            subjects: subjects.map((s) => ({ id: s.id })),
            teachers,
          });

    const lessons = generated
      .map((l) => ({ ...l, day: toDayNumber(l.day) }))
      .sort(sortLessons);

    // Перевіряємо наявність будь-яких конфліктів у сформованій чернетці
    const detectedConflicts = [];
    for (let i = 0; i < lessons.length; i += 1) {
      const current = lessons[i];
      const others = lessons.slice(i + 1);
      const found = conflicts(current, others, scenarioGroups);
      if (found.length > 0) {
        detectedConflicts.push({ lesson: current, conflicts: found });
      }
    }

    // Потрібні кімнати: кожній спрогнозованій групі потрібна 1 кімната
    const roomsNeeded = scenarioGroups.length;

    // Потрібні викладачі: задіяні у запланованих заняттях + додаткові за предметами, які не вдалося закрити
    const usedTeacherIds = new Set(lessons.map((l) => l.staffId));
    const unscheduledSubjects = new Set(unscheduled.map((u) => u.subjectId));
    const teachersNeeded = usedTeacherIds.size + unscheduledSubjects.size;

    // Сценарій, за яким побудовано прогноз: видно, які групи реальні, а які віртуальні,
    // і скільки дітей закладено в кожну (кількість дітей не впливає на сітку занять,
    // але підтверджує вхідні параметри та ліміт 20 дітей у групі)
    const scenario = {
      groups: scenarioGroups.map((g) => ({
        groupId: g.id,
        roomId: g.roomId > 0 ? g.roomId : null,
        childrenCount: g.childrenCount,
        isVirtual: g.isVirtual,
      })),
      totalChildren: scenarioGroups.reduce((sum, g) => sum + g.childrenCount, 0),
    };

    return {
      lessons,
      unscheduled,
      conflicts: detectedConflicts,
      roomsNeeded,
      teachersNeeded,
      scenario,
    };
  }

  return { generateSchedules, forecastSchedule };
}

const schedulesService = createSchedulesService({
  groupsService: { list: () => groupsModule.groupsService.list() },
  subjectsService: { list: () => subjectsModule.subjectsService.getAll() },
  staffService: { list: () => staffModule.staffService.getAll() },
  childrenService: { list: () => childrenModule.childrenService.list() },
  lessonsRepository: lessonsModule.lessonsRepository ?? lessonsModule,
});

export const generateSchedules = (args) =>
  schedulesService.generateSchedules(args);

export const forecastSchedule = (args) =>
  schedulesService.forecastSchedule(args);