import { SCHEDULE } from "../../config/constants.js";
import { findConflicts } from "../lessons/lessons.rules.js";

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function generateSchedule({
  groups = [],
  subjects = [],
  teachers = [],
  config = SCHEDULE,
}) {
  const lessons = [];
  const unscheduled = [];

  const groupLessonsCount = new Map();
  const subjectLessonsCount = new Map();

  const slots = config.DAYS.flatMap((day) =>
    Array.from({ length: config.SLOTS_PER_DAY }, (_, index) => ({
      day,
      start: toTime(
        toMinutes(config.DAY_START) + index * config.LESSON_MINUTES,
      ),
      duration: config.LESSON_MINUTES,
    })),
  );

  for (const group of groups) {
    for (const subject of subjects) {
      const required = config.LESSONS_PER_SUBJECT_PER_WEEK ?? 1;
      const subjectKey = `${group.id}:${subject.id}`;

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

            return (
              findConflicts(candidateLesson, lessons, groups).length === 0
            );
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
          subjectLessonsCount.set(
            subjectKey,
            (subjectLessonsCount.get(subjectKey) ?? 0) + 1,
          );

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
