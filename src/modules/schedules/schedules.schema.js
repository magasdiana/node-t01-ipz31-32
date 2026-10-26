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
    })
    .default({}),
  params: z.object({}),
  query: z.object({}),
});
