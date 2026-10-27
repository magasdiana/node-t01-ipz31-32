import { SCHEDULE } from "../../config/constants.js";
import { findConflicts } from "../lessons/lessons.rules.js";
import { toMinutes, intervalsOverlap } from "../../lib/time.js";

function toTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Початки занять за один день: кроком LESSON_MINUTES у вікні перебування,
// без тих, що перетинаються з харчуванням або сном (FR-17, FR-18)
function buildDaySlots(config) {
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

export function generateSchedule({
  groups = [],
  subjects = [],
  teachers = [],
  config: overrides = {},
}) {
  // Переданий config може містити лише частину полів; решту беремо з SCHEDULE
  const config = { ...SCHEDULE, ...overrides };

  const lessons = [];
  const unscheduled = [];
  const groupLessonsCount = new Map();

  const daySlots = buildDaySlots(config);
  const slots = config.DAYS.flatMap((day) =>
    daySlots.map((start) => ({
      day,
      start: toTime(start),
      duration: config.LESSON_MINUTES,
    })),
  );

  for (const group of groups) {
    for (const subject of subjects) {
      const required = config.LESSONS_PER_SUBJECT_PER_WEEK ?? 1;

      for (let occurrence = 0; occurrence < required; occurrence += 1) {
        const availableTeachers = teachers.filter((teacher) =>
          teacher.subjectIds?.includes(subject.id),
        );

        if (availableTeachers.length === 0) {
          unscheduled.push({
            groupId: group.id,
            subjectId: subject.id,
            reason: "No teacher available for this subject",
          });
          continue;
        }

        let scheduled = false;

        for (const slot of slots) {
          const dailyKey = `${group.id}:${slot.day}`;
          const dailyCount = groupLessonsCount.get(dailyKey) ?? 0;

          if (dailyCount >= config.MAX_SUBJECT_LESSONS_PER_DAY) {
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
            return findConflicts(candidateLesson, lessons, groups).length === 0;
          });

          if (!teacher) {
            continue;
          }

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
            reason: "No suitable time slot available",
          });
        }
      }
    }
  }

  return { lessons, unscheduled };
}
