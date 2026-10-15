import { z } from "zod";

// id з URL: /children/5 -> 5
export const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

// Дата у форматі YYYY-MM-DD, яка існує в календарі (30 лютого не пройде)
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Очікується формат YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Неіснуюча дата");

// Діапазон дат для query: ?from=2026-09-01&to=2026-09-30
export const dateRangeQuery = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "from не може бути пізніше to",
  });
