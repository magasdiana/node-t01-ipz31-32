import { z } from "zod";

const groupId = z.coerce.number().int().positive();

// POST /schedules. Тіло необов'язкове: без groupIds розклад генерується для всіх груп.
export const generateScheduleSchema = z.object({
  body: z
    .object({
      groupIds: z
        .array(groupId)
        .min(1, "Масив groupIds не може бути порожнім")
        .optional(),
      save: z.boolean().optional(),
    })
    .default({}),
  params: z.object({}),
  query: z.object({}),
});

// GET /schedules/forecast
export const forecastScheduleSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z
    .object({
      groups: z
        .string()
        .regex(/^[1-9]\d*$/, "groups має бути додатним цілим числом")
        .optional()
        .transform((v) => (v === undefined ? undefined : Number(v)))
        .refine(
          (v) => v === undefined || (Number.isSafeInteger(v) && v <= 50),
          "groups має бути від 1 до 50",
        ),
      children: z
        .string()
        .regex(/^\d+(,\d+)*$/, "children: число або список чисел через кому")
        .optional(),
    })
    .optional()
    .default({}),
});