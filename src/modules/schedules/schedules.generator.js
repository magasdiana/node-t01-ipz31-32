import { SCHEDULE } from "../../config/constants.js";
import { findConflicts } from "../lessons/lessons.rules.js";
import { toMinutes, intervalsOverlap } from "../../lib/time.js";

// Коди причин, з яких заняття не вдалося розставити (поле unscheduled[].code)
export const UNSCHEDULED_CODES = Object.freeze({
  NO_TEACHER: "NO_TEACHER", // жоден викладач не веде цей гурток
  NO_SLOT: "NO_SLOT", // є викладачі, але немає вільного часу
});

const REASONS = {
  [UNSCHEDULED_CODES.NO_TEACHER]: "Немає викладача, який веде цей гурток",
  [UNSCHEDULED_CODES.NO_SLOT]:
    "Немає вільного часу без накладок і з урахуванням ліміту занять на день",
};

function toTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Початки занять за один день: кроком LESSON_MINUTES у вікні перебування,
// без тих, що перетинаються з харчуванням або сном (FR-17, FR-18)
export function buildDaySlots(config) {
  const dayStart = toMinutes(config.DAY_START);
  const dayEnd = dayStart + config.STAY_HOURS * 60;

  const breaks = config.FIXED_BREAKS.map((b) => {
    const start = toMinutes(b.start);
    return { start, end: start + b.minutes };
  });

  const starts = [];
  for (
    let t = dayStart;
    t + config.LESSON_MINUTES <= dayEnd;
    t += config.LESSON_MINUTES
  ) {
    const end = t + config.LESSON_MINUTES;
    if (breaks.some((b) => intervalsOverlap(t, end, b.start, b.end))) continue;
    starts.push(t);
  }
  return starts;
}

// Збережені заняття можуть мати день числом (1-5, як у БД) або рядком ("mon")
function normalizeDay(day, config) {
  return typeof day === "number" ? (config.DAYS[day - 1] ?? day) : day;
}

/**
 * Генерує тижневий розклад.
 *
 * @param {object}   input
 * @param {Array}    input.groups        групи, для яких будуємо розклад: { id, roomId }
 * @param {Array}    input.subjects      гуртки: { id }
 * @param {Array}    input.teachers      викладачі: { id, subjectIds }
 * @param {Array}    input.busyLessons   заняття, які вже існують (наприклад, груп, що
 *                                       лишаються): генератор планує навколо них, щоб
 *                                       не створити накладок за викладачем чи кімнатою.
 *                                       Формат: { groupId, staffId, roomId, day, start, duration }
 * @param {object}   input.config        перевизначення констант SCHEDULE
 * @returns {{ lessons: Array, unscheduled: Array }}
 */
export function generateSchedule({
  groups = [],
  subjects = [],
  teachers = [],
  busyLessons = [],
  config: overrides = {},
}) {
  // Переданий config може містити лише частину полів; решту беремо з SCHEDULE
  const config = { ...SCHEDULE, ...overrides };

  const lessons = [];
  const unscheduled = [];
  const groupLessonsCount = new Map();

  const busy = busyLessons.map((lesson) => ({
    ...lesson,
    day: normalizeDay(lesson.day, config),
  }));

  const daySlots = buildDaySlots(config);
  const slots = config.DAYS.flatMap((day) =>
    daySlots.map((start) => ({
      day,
      start: toTime(start),
      duration: config.LESSON_MINUTES,
    })),
  );

  const maxPerDay = config.MAX_SUBJECT_LESSONS_PER_DAY;
  const required = config.LESSONS_PER_SUBJECT_PER_WEEK ?? 1;

  for (const group of groups) {
    for (const subject of subjects) {
      const availableTeachers = teachers.filter((teacher) =>
        teacher.subjectIds?.includes(subject.id),
      );

      for (let occurrence = 0; occurrence < required; occurrence += 1) {
        if (availableTeachers.length === 0) {
          unscheduled.push({
            groupId: group.id,
            subjectId: subject.id,
            code: UNSCHEDULED_CODES.NO_TEACHER,
            reason: REASONS[UNSCHEDULED_CODES.NO_TEACHER],
          });
          continue;
        }

        // Спершу дні, у яких група має найменше занять: гуртки розподіляються
        // рівномірно за тижнем (FR-20). Сортування стабільне, тож у межах
        // дня порядок слотів лишається за часом.
        const orderedSlots = [...slots].sort(
          (a, b) =>
            (groupLessonsCount.get(`${group.id}:${a.day}`) ?? 0) -
            (groupLessonsCount.get(`${group.id}:${b.day}`) ?? 0),
        );

        const known = [...busy, ...lessons];
        const blockedBy = new Set();
        let scheduled = false;

        for (const slot of orderedSlots) {
          const dailyKey = `${group.id}:${slot.day}`;
          const dailyCount = groupLessonsCount.get(dailyKey) ?? 0;

          if (dailyCount >= maxPerDay) {
            blockedBy.add("daily_limit");
            continue;
          }

          const candidateLesson = {
            groupId: group.id,
            subjectId: subject.id,
            staffId: null,
            day: slot.day,
            start: slot.start,
            duration: slot.duration,
            roomId: group.roomId ?? null,
          };

          const teacher = availableTeachers.find((candidate) => {
            candidateLesson.staffId = candidate.id;
            const found = findConflicts(candidateLesson, known, groups);
            found.forEach((c) => blockedBy.add(c.type));
            return found.length === 0;
          });

          if (!teacher) continue;

          lessons.push({
            groupId: group.id,
            subjectId: subject.id,
            staffId: teacher.id,
            day: slot.day,
            start: slot.start,
            duration: slot.duration,
          });

          groupLessonsCount.set(dailyKey, dailyCount + 1);
          scheduled = true;
          break;
        }

        if (!scheduled) {
          unscheduled.push({
            groupId: group.id,
            subjectId: subject.id,
            code: UNSCHEDULED_CODES.NO_SLOT,
            reason: REASONS[UNSCHEDULED_CODES.NO_SLOT],
            // що саме блокувало: teacher, group, room, daily_limit
            blockedBy: [...blockedBy].sort(),
          });
        }
      }
    }
  }

  return { lessons, unscheduled };
}
