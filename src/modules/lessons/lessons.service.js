import { SCHEDULE } from "../../config/constants.js";
import { toDto } from "../../lib/dto.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/errors.js";
import { toHHMM, toMinutes } from "../../lib/time.js";
import { groupsService } from "../groups/groups.service.js";
import { findConflicts } from "./lessons.rules.js";
import { lessonsRepository } from "./lessons.repository.js";

const DAY_NAMES = {
  1: "понеділок",
  2: "вівторок",
  3: "середа",
  4: "четвер",
  5: "п'ятниця",
};

// Рядок БД -> { id, groupId, subjectId, staffId, day, start, duration }
const lessonDto = (row) =>
  toDto(row, {
    groupId: row.groupId,
    subjectId: row.subjectId,
    staffId: row.staffId,
  });

// День за зростанням, потім час початку, потім id
const byDayAndTime = (a, b) =>
  a.day - b.day || a.start.localeCompare(b.start) || a.id - b.id;

const describeSlot = (lesson) => {
  const start = toMinutes(lesson.start);
  const end = toHHMM(start + lesson.duration);
  return `${DAY_NAMES[lesson.day] ?? `день ${lesson.day}`} ${lesson.start}-${end}`;
};

const CONFLICT_MESSAGES = {
  teacher: (lesson) =>
    `Викладач (id ${lesson.staffId}) уже веде інше заняття: ${describeSlot(lesson)}`,
  group: (lesson) =>
    `У групи (id ${lesson.groupId}) уже є інше заняття: ${describeSlot(lesson)}`,
  room: (lesson) =>
    `Кімната вже зайнята групою (id ${lesson.groupId}): ${describeSlot(lesson)}`,
};

// Перетворює результат findConflicts на зрозумілий клієнту список
function explainConflicts(conflicts, candidate) {
  return (
    conflicts
      // Для тієї ж групи кімната та сама, тож room-конфлікт дублює group-конфлікт
      .filter(
        (c) => !(c.type === "room" && c.lesson.groupId === candidate.groupId),
      )
      .map((c) => ({
        type: c.type,
        message: CONFLICT_MESSAGES[c.type](c.lesson),
        conflictingLesson: c.lesson,
      }))
  );
}

export const lessonsService = {
  // GET /groups/:id/lessons
  async listByGroup(groupId) {
    // 404, якщо групи немає
    await groupsService.getById(groupId);

    const rows = await lessonsRepository.findByGroupId(groupId);
    return rows.map(lessonDto).sort(byDayAndTime);
  },

  // PATCH /lessons/:id
  async update(id, input) {
    const row = await lessonsRepository.findById(id);

    if (!row) {
      throw new NotFoundError("Заняття не знайдено");
    }

    const current = lessonDto(row);
    const day = input.day ?? current.day;
    const start = input.start ?? current.start;
    const duration = current.duration ?? SCHEDULE.LESSON_MINUTES;

    if (toMinutes(start) + duration > 24 * 60) {
      throw new BadRequestError("Заняття не може закінчуватися після 24:00");
    }

    // roomId береться з групи заняття
    const group = await groupsService.getById(row.groupId);

    const candidate = {
      groupId: row.groupId,
      subjectId: row.subjectId,
      staffId: row.staffId,
      day,
      start,
      duration,
      roomId: group.roomId ?? null,
    };

    // Інші заняття без самого цього, інакше воно конфліктуватиме саме з собою
    const others = (await lessonsRepository.findAllExcept(id)).map(lessonDto);
    const groups = await groupsService.list();

    const conflicts = explainConflicts(
      findConflicts(candidate, others, groups),
      candidate,
    );

    if (conflicts.length > 0) {
      throw new ConflictError(
        "Не можна перенести заняття: конфлікт із поточним розкладом",
        conflicts,
      );
    }

    const updated = await lessonsRepository.update(id, {
      data: { ...row.data, day, start, duration },
    });

    return lessonDto(updated);
  },
};
