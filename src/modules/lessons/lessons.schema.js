import { z } from "zod";
import { idParam } from "../../lib/schemas.js";

// Схеми за шаблоном { body, params, query }, підключаються через validate()

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

// 1 = понеділок ... 5 = п'ятниця
export const lessonDay = z.number().int().min(1).max(5);
export const lessonStart = z.string().regex(HHMM, "Очікується формат HH:MM");

const emptyQuery = z.object({});

// GET /groups/:id/lessons
export const groupLessonsSchema = z.object({
  params: idParam,
  query: emptyQuery,
});

// PATCH /lessons/:id: можна змінити тільки день і/або час початку
export const updateLessonSchema = z.object({
  params: idParam,
  query: emptyQuery,
  body: z
    .object({
      day: lessonDay.optional(),
      start: lessonStart.optional(),
    })
    .strict()
    .refine((body) => body.day !== undefined || body.start !== undefined, {
      message: "Потрібно передати day і/або start",
    }),
});
