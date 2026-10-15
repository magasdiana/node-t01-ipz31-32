// The "schema" layer of the children module.

import { z } from "zod";

const groupIdSchema = z.union([
  z.coerce.number().int().positive(),
  z.null(),
]);

export const childCreateSchema = z.object({
  name: z.string().trim().min(1, "Вкажіть ім'я дитини"),
  birthDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Дата народження має бути у форматі YYYY-MM-DD",
  ),
  guardians: z.array(z.string().trim().min(1)).optional(),
  relativeVip: z.boolean().optional(),
  preferences: z.any().optional(),
  benefitType: z.enum(["none", "min", "medium", "max"]).optional(),
  groupId: groupIdSchema.optional(),
  group_id: groupIdSchema.optional(),
});

export const childUpdateSchema = childCreateSchema.partial();

export const childIdSchema = z.coerce.number().int().positive();
